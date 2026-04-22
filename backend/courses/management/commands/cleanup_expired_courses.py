"""
Management command: cleanup_expired_courses

Удаляет курсы, у которых истёк 90-дневный переходный период после
подтверждения удаления администратором.

Для каждого такого курса:
1. Удаляет все связанные видео с Vimeo
2. Удаляет все связанные файлы с Google Drive
3. Удаляет курс из базы данных (CASCADE: модули, контент, энrollments, прогресс)

Запуск:
    python manage.py cleanup_expired_courses
    python manage.py cleanup_expired_courses --dry-run   # только показать, не удалять
"""

import json
import logging

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from courses.models import Course
from storage.models import VimeoVideo, GoogleDriveFile

logger = logging.getLogger(__name__)

TRANSITION_DAYS = 90


def _collect_course_videos(course):
    """Собирает все VimeoVideo, связанные с курсом."""
    video_ids = set()

    # Из модулей теории/питания/восстановления
    for module in course.modules.all():
        for content in module.contents.select_related('video').filter(video__isnull=False):
            video_ids.add(content.video.vimeo_id)

    # Из тренировочного расписания
    for variant in course.variants.all():
        for week in variant.weeks.all():
            for day in week.days.all():
                for content in day.contents.select_related('video').filter(video__isnull=False):
                    video_ids.add(content.video.vimeo_id)

    return video_ids


def _collect_course_drive_files(course):
    """Собирает все GoogleDriveFile, связанные с курсом."""
    file_ids = set()

    for module in course.modules.all():
        for content in module.contents.select_related('file').filter(file__isnull=False):
            file_ids.add(content.file.gdrive_id)

    for variant in course.variants.all():
        for week in variant.weeks.all():
            for day in week.days.all():
                for content in day.contents.select_related('file').filter(file__isnull=False):
                    file_ids.add(content.file.gdrive_id)

    return file_ids


def _delete_vimeo_video(vimeo_id, token):
    """Удаляет видео с Vimeo по ID."""
    url = f'https://api.vimeo.com/videos/{vimeo_id}'
    resp = requests.delete(url, headers={'Authorization': f'bearer {token}'}, timeout=15)
    if resp.status_code == 204:
        return True
    if resp.status_code == 404:
        logger.warning('Vimeo video %s not found (already deleted?)', vimeo_id)
        return True
    logger.error('Failed to delete Vimeo video %s: %s %s', vimeo_id, resp.status_code, resp.text)
    return False


def _delete_drive_file(gdrive_id):
    """Удаляет файл с Google Drive по ID."""
    try:
        import json as _json
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        credentials_info = _json.loads(settings.GDRIVE_SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=['https://www.googleapis.com/auth/drive'],
        )
        service = build('drive', 'v3', credentials=credentials)
        service.files().delete(fileId=gdrive_id).execute()
        return True
    except Exception as exc:
        logger.error('Failed to delete Drive file %s: %s', gdrive_id, exc)
        return False


class Command(BaseCommand):
    help = 'Удаляет курсы с истёкшим 90-дневным переходным периодом (контент с Vimeo и Google Drive)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет удалено, не выполняя реального удаления',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        cutoff = timezone.now() - timezone.timedelta(days=TRANSITION_DAYS)

        expired = Course.objects.filter(
            deletion_confirmed_at__isnull=False,
            deletion_confirmed_at__lte=cutoff,
        ).prefetch_related(
            'modules__contents__video',
            'modules__contents__file',
            'variants__weeks__days__contents__video',
            'variants__weeks__days__contents__file',
        )

        count = expired.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('Нет курсов с истёкшим переходным периодом.'))
            return

        self.stdout.write(f'Найдено {count} курс(ов) для удаления.')

        vimeo_token = getattr(settings, 'VIMEO_ACCESS_TOKEN', None)

        for course in expired:
            self.stdout.write(f'\n[{course.id}] {course.title}')
            self.stdout.write(f'  Переходный период истёк: {course.deletion_confirmed_at + timezone.timedelta(days=TRANSITION_DAYS):%d.%m.%Y}')

            video_ids = _collect_course_videos(course)
            file_ids = _collect_course_drive_files(course)
            self.stdout.write(f'  Видео Vimeo: {len(video_ids)}, файлы Drive: {len(file_ids)}')

            if dry_run:
                self.stdout.write(self.style.WARNING('  [dry-run] Пропущено.'))
                continue

            # Удаление с Vimeo
            if vimeo_token:
                for vid in video_ids:
                    ok = _delete_vimeo_video(vid, vimeo_token)
                    status = 'OK' if ok else 'ОШИБКА'
                    self.stdout.write(f'  Vimeo {vid}: {status}')
            else:
                self.stdout.write(self.style.WARNING('  VIMEO_ACCESS_TOKEN не задан, пропускаем удаление видео'))

            # Удаление с Google Drive
            for fid in file_ids:
                ok = _delete_drive_file(fid)
                status = 'OK' if ok else 'ОШИБКА'
                self.stdout.write(f'  Drive {fid}: {status}')

            # Удаление курса из БД (CASCADE)
            course_title = course.title
            course.delete()
            self.stdout.write(self.style.SUCCESS(f'  Курс "{course_title}" удалён из БД.'))

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'\nГотово. Удалено {count} курс(ов).'))
        else:
            self.stdout.write(self.style.WARNING(f'\n[dry-run] Ничего не удалено. Найдено {count} курс(ов) для удаления.'))
