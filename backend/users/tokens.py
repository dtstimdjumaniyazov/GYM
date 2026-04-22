from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken


def get_tokens_for_user(user):
    """
    Генерирует JWT токены для пользователя с поддержкой single-session.
    Увеличивает token_version — все предыдущие токены становятся недействительными.
    """
    user.token_version += 1
    user.save(update_fields=['token_version'])

    refresh = RefreshToken.for_user(user)
    refresh['token_version'] = user.token_version

    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


class SingleSessionJWTAuthentication(JWTAuthentication):
    """
    Проверяет token_version в JWT.
    Если версия не совпадает с текущей у пользователя — токен недействителен.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        token_version = validated_token.get('token_version')
        if token_version is not None and token_version != user.token_version:
            raise InvalidToken('Сессия недействительна. Войдите заново.')
        return user
