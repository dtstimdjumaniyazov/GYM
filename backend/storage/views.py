import io
import requests
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.permissions import IsTrainer
from storage.models import VimeoVideo, GoogleDriveFile
from storage.serializers import (
    VimeoInitSerializer,
    VimeoStatusSerializer,
    VimeoVideoReadSerializer,
    GoogleDriveFileReadSerializer,
)


def _get_drive_service():
    """Строит авторизованный Google Drive клиент через OAuth2 refresh token."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials(
        token=None,
        refresh_token=settings.GDRIVE_REFRESH_TOKEN,
        client_id=settings.GDRIVE_CLIENT_ID,
        client_secret=settings.GDRIVE_CLIENT_SECRET,
        token_uri='https://oauth2.googleapis.com/token',
    )
    return build('drive', 'v3', credentials=credentials)


class VimeoInitUploadView(APIView):
    """
    POST /api/storage/vimeo/init/
    Инициализирует TUS-загрузку видео на Vimeo.
    Возвращает upload_url для прямой загрузки с фронтенда.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def post(self, request):
        serializer = VimeoInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        token = settings.VIMEO_ACCESS_TOKEN
        if not token:
            return Response(
                {'detail': 'Vimeo не настроен на сервере. Укажите VIMEO_ACCESS_TOKEN в .env'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        trainer = request.user.trainer_profile

        vimeo_response = requests.post(
            'https://api.vimeo.com/me/videos',
            headers={
                'Authorization': f'bearer {token}',
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.vimeo.*+json;version=3.4',
            },
            json={
                'upload': {
                    'approach': 'tus',
                    'size': data['file_size'],
                },
                'name': data['title'],
                'description': data.get('description', ''),
                'privacy': {'view': 'disable'},
            },
            timeout=30,
        )

        if vimeo_response.status_code not in (200, 201):
            return Response(
                {
                    'detail': 'Ошибка Vimeo API при инициализации загрузки',
                    'vimeo_error': vimeo_response.text,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        vimeo_data = vimeo_response.json()
        upload_link = vimeo_data['upload']['upload_link']
        vimeo_uri = vimeo_data.get('uri', '')
        vimeo_id = vimeo_uri.split('/')[-1] if vimeo_uri else ''

        video = VimeoVideo.objects.create(
            title=data['title'],
            vimeo_id=vimeo_id,
            upload_status=VimeoVideo.UploadStatus.UPLOADING,
            uploaded_by=trainer,
        )

        return Response({
            'vimeo_video_id': str(video.id),
            'upload_url': upload_link,
            'vimeo_id': vimeo_id,
        }, status=status.HTTP_201_CREATED)


class VimeoStatusView(APIView):
    """
    PATCH /api/storage/vimeo/<uuid:pk>/status/
    Обновляет статус видео после завершения TUS-загрузки.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def patch(self, request, pk):
        try:
            video = VimeoVideo.objects.get(pk=pk, uploaded_by=request.user.trainer_profile)
        except VimeoVideo.DoesNotExist:
            return Response({'detail': 'Видео не найдено'}, status=status.HTTP_404_NOT_FOUND)

        serializer = VimeoStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        video.upload_status = data['status']
        if data.get('vimeo_id'):
            video.vimeo_id = data['vimeo_id']
        if data.get('playback_url'):
            video.playback_url = data['playback_url']
        if data.get('thumbnail_url'):
            video.thumbnail_url = data['thumbnail_url']
        if data.get('duration_seconds') is not None:
            video.duration_seconds = data['duration_seconds']
        video.save()

        return Response(VimeoVideoReadSerializer(video).data)


class VimeoDeleteView(APIView):
    """
    DELETE /api/storage/vimeo/<uuid:pk>/delete/
    Удаляет видео с Vimeo и из базы данных.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def delete(self, request, pk):
        try:
            video = VimeoVideo.objects.get(pk=pk, uploaded_by=request.user.trainer_profile)
        except VimeoVideo.DoesNotExist:
            return Response({'detail': 'Видео не найдено'}, status=status.HTTP_404_NOT_FOUND)

        token = settings.VIMEO_ACCESS_TOKEN
        if token and video.vimeo_id:
            try:
                requests.delete(
                    f'https://api.vimeo.com/videos/{video.vimeo_id}',
                    headers={
                        'Authorization': f'bearer {token}',
                        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
                    },
                    timeout=15,
                )
            except Exception:
                pass

        video.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GDriveUploadView(APIView):
    """
    POST /api/storage/gdrive/upload/
    Загружает PDF/JPEG/PNG на Google Drive через service account.
    Файл не открывается публично — доступ через GDriveFileProxyView.
    """
    permission_classes = [IsAuthenticated, IsTrainer]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'Поле file обязательно'}, status=status.HTTP_400_BAD_REQUEST)

        mime_type = file_obj.content_type
        if mime_type not in self.ALLOWED_TYPES:
            return Response(
                {'detail': f'Неподдерживаемый тип файла: {mime_type}. Допустимы: PDF, JPEG, PNG'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not settings.GDRIVE_REFRESH_TOKEN:
            return Response(
                {'detail': 'Google Drive не настроен. Укажите GDRIVE_REFRESH_TOKEN в .env'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from googleapiclient.http import MediaIoBaseUpload

            drive_service = _get_drive_service()
            folder_id = settings.GDRIVE_FOLDER_ID

            file_metadata = {'name': file_obj.name}
            if folder_id:
                file_metadata['parents'] = [folder_id]

            media = MediaIoBaseUpload(
                io.BytesIO(file_obj.read()),
                mimetype=mime_type,
                resumable=True,
            )
            uploaded = drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,size,webViewLink',
                supportsAllDrives=True,
            ).execute()

        except Exception as exc:
            return Response(
                {'detail': f'Ошибка загрузки на Google Drive: {str(exc)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        trainer = request.user.trainer_profile
        gdrive_file = GoogleDriveFile.objects.create(
            gdrive_id=uploaded['id'],
            filename=file_obj.name,
            mime_type=mime_type,
            file_size=file_obj.size,
            view_url=uploaded.get('webViewLink', ''),
            upload_status=GoogleDriveFile.UploadStatus.COMPLETE,
            uploaded_by=trainer,
        )

        return Response(
            GoogleDriveFileReadSerializer(gdrive_file).data,
            status=status.HTTP_201_CREATED,
        )


class GDriveDeleteView(APIView):
    """
    DELETE /api/storage/gdrive/<uuid:pk>/delete/
    Удаляет файл с Google Drive и из базы данных.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def delete(self, request, pk):
        try:
            gdrive_file = GoogleDriveFile.objects.get(pk=pk, uploaded_by=request.user.trainer_profile)
        except GoogleDriveFile.DoesNotExist:
            return Response({'detail': 'Файл не найден'}, status=status.HTTP_404_NOT_FOUND)

        if settings.GDRIVE_REFRESH_TOKEN:
            try:
                drive_service = _get_drive_service()
                drive_service.files().delete(fileId=gdrive_file.gdrive_id).execute()
            except Exception:
                pass

        gdrive_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GDriveFileProxyView(APIView):
    """
    GET /api/storage/gdrive/<uuid:pk>/view/
    Скачивает файл с Google Drive через service account и отдаёт клиенту.
    Не требует публичного доступа к файлу на Google Drive.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            gdrive_file = GoogleDriveFile.objects.get(pk=pk)
        except GoogleDriveFile.DoesNotExist:
            return Response({'detail': 'Файл не найден'}, status=status.HTTP_404_NOT_FOUND)

        if not settings.GDRIVE_REFRESH_TOKEN:
            return Response(
                {'detail': 'Google Drive не настроен'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from googleapiclient.http import MediaIoBaseDownload

            drive_service = _get_drive_service()
            request_obj = drive_service.files().get_media(
                fileId=gdrive_file.gdrive_id,
                supportsAllDrives=True,
            )

            buf = io.BytesIO()
            downloader = MediaIoBaseDownload(buf, request_obj)
            done = False
            while not done:
                _, done = downloader.next_chunk()

            buf.seek(0)

        except Exception as exc:
            return Response(
                {'detail': f'Ошибка получения файла с Google Drive: {str(exc)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        response = StreamingHttpResponse(
            buf,
            content_type=gdrive_file.mime_type,
        )
        safe_name = gdrive_file.filename.encode('ascii', 'ignore').decode()
        response['Content-Disposition'] = f'inline; filename="{safe_name}"'
        response['Cache-Control'] = 'private, max-age=3600'
        return response
