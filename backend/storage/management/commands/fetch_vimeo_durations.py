import time
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from storage.models import VimeoVideo


class Command(BaseCommand):
    help = 'Fetch duration from Vimeo API for videos where duration_seconds is null'

    def handle(self, *args, **options):
        token = settings.VIMEO_ACCESS_TOKEN
        if not token:
            self.stderr.write('VIMEO_ACCESS_TOKEN not set')
            return

        videos = VimeoVideo.objects.filter(duration_seconds__isnull=True, vimeo_id__isnull=False).exclude(vimeo_id='')
        total = videos.count()
        self.stdout.write(f'Found {total} videos without duration')

        updated = 0
        for video in videos:
            try:
                resp = requests.get(
                    f'https://api.vimeo.com/videos/{video.vimeo_id}',
                    headers={
                        'Authorization': f'bearer {token}',
                        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
                    },
                    timeout=10,
                )
                if resp.status_code == 200:
                    duration = resp.json().get('duration')
                    if duration:
                        video.duration_seconds = duration
                        video.save(update_fields=['duration_seconds', 'updated_at'])
                        updated += 1
                        self.stdout.write(f'  ✓ {video.title} — {duration}s')
                    else:
                        self.stdout.write(f'  - {video.title} — duration not available yet')
                elif resp.status_code == 404:
                    self.stdout.write(f'  ✗ {video.title} — not found on Vimeo')
                else:
                    self.stdout.write(f'  ✗ {video.title} — HTTP {resp.status_code}')
            except Exception as e:
                self.stderr.write(f'  error for {video.title}: {e}')
            time.sleep(0.3)  # rate limit

        self.stdout.write(self.style.SUCCESS(f'Done: {updated}/{total} updated'))
