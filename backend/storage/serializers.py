from rest_framework import serializers
from storage.models import VimeoVideo, GoogleDriveFile


class VimeoInitSerializer(serializers.Serializer):
    """Инициализация загрузки видео на Vimeo."""
    title = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)


class VimeoStatusSerializer(serializers.Serializer):
    """Обновление статуса видео после загрузки."""
    status = serializers.ChoiceField(choices=VimeoVideo.UploadStatus.choices)
    vimeo_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    playback_url = serializers.URLField(max_length=500, required=False, allow_blank=True)
    thumbnail_url = serializers.URLField(max_length=500, required=False, allow_blank=True)
    duration_seconds = serializers.IntegerField(min_value=0, required=False, allow_null=True)


class VimeoVideoReadSerializer(serializers.ModelSerializer):
    duration_formatted = serializers.CharField(read_only=True)

    class Meta:
        model = VimeoVideo
        fields = [
            'id', 'vimeo_id', 'title', 'upload_status',
            'duration_seconds', 'duration_formatted',
            'thumbnail_url', 'playback_url',
        ]


class GoogleDriveFileReadSerializer(serializers.ModelSerializer):
    file_size_formatted = serializers.CharField(read_only=True)

    class Meta:
        model = GoogleDriveFile
        fields = [
            'id', 'gdrive_id', 'filename', 'mime_type',
            'file_size', 'file_size_formatted', 'view_url', 'upload_status',
        ]
