"""
Management command to register the Telegram bot webhook with Telegram's API.

Usage:
    python manage.py set_telegram_webhook

This sets the webhook URL to:
    https://fitevolution.uz/api/users/auth/telegram/bot-webhook/<BOT_TOKEN>/

The bot token is included in the URL as a security measure — Telegram will
include it in every request, allowing the view to verify the caller.
"""

import requests
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Register the Telegram bot webhook with Telegram API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--url',
            type=str,
            default='https://fitevolution.uz',
            help='Base URL of the server (default: https://fitevolution.uz)',
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete the current webhook instead of setting one',
        )

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            self.stderr.write(self.style.ERROR('TELEGRAM_BOT_TOKEN is not set in settings/environment'))
            return

        api_base = f'https://api.telegram.org/bot{token}'

        if options['delete']:
            self.stdout.write('Deleting webhook...')
            resp = requests.post(f'{api_base}/deleteWebhook', timeout=10)
            result = resp.json()
            if result.get('ok'):
                self.stdout.write(self.style.SUCCESS('Webhook deleted successfully'))
            else:
                self.stderr.write(self.style.ERROR(f'Failed to delete webhook: {result}'))
            return

        base_url = options['url'].rstrip('/')
        webhook_url = f'{base_url}/api/users/auth/telegram/bot-webhook/{token}/'

        self.stdout.write(f'Setting webhook to: {webhook_url}')

        resp = requests.post(
            f'{api_base}/setWebhook',
            json={
                'url': webhook_url,
                'allowed_updates': ['message'],
                'drop_pending_updates': True,
            },
            timeout=10,
        )
        result = resp.json()

        if result.get('ok'):
            self.stdout.write(self.style.SUCCESS(
                f'Webhook set successfully: {result.get("description", "OK")}'
            ))
        else:
            self.stderr.write(self.style.ERROR(
                f'Failed to set webhook: {result}'
            ))

        # Also print current webhook info
        info_resp = requests.get(f'{api_base}/getWebhookInfo', timeout=10)
        info = info_resp.json().get('result', {})
        self.stdout.write(f'\nCurrent webhook info:')
        self.stdout.write(f'  URL: {info.get("url", "(none)")}')
        self.stdout.write(f'  Pending updates: {info.get("pending_update_count", 0)}')
        last_error = info.get('last_error_message')
        if last_error:
            self.stdout.write(self.style.WARNING(f'  Last error: {last_error}'))
