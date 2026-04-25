import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_telegram(chat_id, text):
    """Send a Telegram message via the bot. Silently ignores errors."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token or not chat_id:
        return
    try:
        requests.post(
            f'https://api.telegram.org/bot{token}/sendMessage',
            json={'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'},
            timeout=5,
        )
    except Exception as exc:
        logger.warning('Telegram send failed for chat_id=%s: %s', chat_id, exc)


def notify_user(user, notif_type, title, body='', related_url=''):
    """Create a DB notification for a user and optionally send a Telegram message."""
    from notifications.models import Notification
    Notification.objects.create(
        user=user,
        type=notif_type,
        title=title,
        body=body,
        related_url=related_url,
    )
    if user.telegram_id:
        text = f'<b>{title}</b>'
        if body:
            text += f'\n\n{body}'
        send_telegram(user.telegram_id, text)


def notify_admins(notif_type, title, body='', related_url=''):
    """Notify all staff users + any extra ADMIN_TELEGRAM_IDS from settings."""
    from users.models import User
    admins = list(User.objects.filter(is_staff=True))
    notified_tg_ids = set()

    for admin in admins:
        notify_user(admin, notif_type, title, body, related_url)
        if admin.telegram_id:
            notified_tg_ids.add(str(admin.telegram_id))

    # Extra Telegram IDs from env (e.g. ADMIN_TELEGRAM_IDS=123456,789012)
    raw = getattr(settings, 'ADMIN_TELEGRAM_IDS', '')
    if raw:
        extra_ids = [x.strip() for x in str(raw).split(',') if x.strip()]
        text = f'<b>{title}</b>'
        if body:
            text += f'\n\n{body}'
        for chat_id in extra_ids:
            if chat_id not in notified_tg_ids:
                send_telegram(chat_id, text)
