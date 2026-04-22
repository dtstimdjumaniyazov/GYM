"""Утилиты для работы с Telegram."""

import hmac
import hashlib
import json
from urllib.parse import parse_qs
from django.conf import settings


def verify_telegram_data(init_data: str) -> dict or None:
    """
    Верифицирует данные от Telegram Web App.
    
    Args:
        init_data: Query string из Telegram Web App (window.Telegram.WebApp.initData)
        
    Returns:
        dict с данными пользователя если подпись валидна, иначе None
        
    Example:
        user_data = verify_telegram_data(init_data)
        if user_data:
            telegram_id = user_data.get('id')
    """
    
    if not init_data or not settings.TELEGRAM_BOT_TOKEN:
        return None
    
    try:
        # Парсируем данные
        data = parse_qs(init_data)
        
        # Извлекаем подпись
        signature = data.get('hash', [''])[0]
        
        if not signature:
            return None
        
        # Создаем строку для проверки подписи
        check_string = '\n'.join(
            f'{k}={v[0]}' 
            for k, v in sorted(data.items()) 
            if k != 'hash'
        )
        
        # Вычисляем HMAC
        secret_key = hmac.new(
            b'WebAppData',
            settings.TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        computed_hash = hmac.new(
            secret_key,
            check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if computed_hash != signature:
            return None
        
        # Извлекаем user данные
        user_data_str = data.get('user', ['{}'])[0]
        return json.loads(user_data_str)
        
    except (json.JSONDecodeError, KeyError, AttributeError):
        return None


def get_telegram_login_widget_code(bot_username: str) -> str:
    """
    Генерирует HTML код для Telegram Login Widget.
    
    Args:
        bot_username: Имя бота без @
        
    Returns:
        HTML код виджета
    """
    
    redirect_url = "YOUR_REDIRECT_URL"  # Укажите URL для редиректа
    
    html = f"""
    <script async src="https://telegram.org/js/telegram-widget.js?15" 
            data-telegram-login="{bot_username}" 
            data-size="large" 
            data-auth-url="{redirect_url}" 
            data-request-access="write">
    </script>
    """
    
    return html
