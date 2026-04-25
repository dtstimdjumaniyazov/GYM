import hmac
import hashlib
import time
import jwt as pyjwt

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from django.conf import settings

from django.db.models import Sum

from users.models import User, Trainer, UserConsent
from users.tokens import get_tokens_for_user
from users.serializers import (
    TrainerCardSerializer,
    TrainerDetailSerializer,
    TelegramAuthSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    AccountLinkSerializer,
    TrainerProfileUpdateSerializer,
    TrainerCourseManageSerializer,
)
from users.social_tokens import create_social_token, verify_social_token


class TrainerListView(generics.ListAPIView):
    """Список всех верифицированных тренеров."""
    queryset = Trainer.objects.filter(is_verified=True).select_related('user')
    serializer_class = TrainerCardSerializer
    pagination_class = None


class TrainerDetailView(generics.RetrieveAPIView):
    """Детальная информация о тренере с курсами."""
    serializer_class = TrainerDetailSerializer

    def get_queryset(self):
        return (
            Trainer.objects
            .filter(is_verified=True)
            .select_related('user')
            .prefetch_related('courses__trainer__user')
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Регистрация нового пользователя.

    Expects JSON:
    {
        "phone": "+998901234567",
        "password": "password123",
        "first_name": "John",
        "last_name": "Doe",
        "role": "student" | "trainer"
    }

    Returns JWT tokens + user profile.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        # Передаём trainer-поля через context
        trainer_data = {}
        if request.data.get('role') == User.Role.TRAINER:
            trainer_data = {
                'specialization': request.data.get('specialization', ''),
                'career_start_year': request.data.get('career_start_year') or None,
                'short_description': request.data.get('short_description', ''),
                'bio': request.data.get('bio', ''),
            }

        user = serializer.save(trainer_data=trainer_data)

        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or \
             request.META.get('REMOTE_ADDR')

        # Обязательные согласия при регистрации
        UserConsent.objects.bulk_create([
            UserConsent(user=user, consent_type=UserConsent.ConsentType.REGISTRATION, ip_address=ip),
            UserConsent(user=user, consent_type=UserConsent.ConsentType.PRIVACY, ip_address=ip),
        ])

        # Договор-оферта для тренеров (обязательно при роли trainer)
        if request.data.get('trainer_agreement_consent'):
            UserConsent.objects.create(
                user=user,
                consent_type=UserConsent.ConsentType.TRAINER_AGREEMENT,
                ip_address=ip,
            )

        # Маркетинговые уведомления (опционально)
        if request.data.get('marketing_consent'):
            UserConsent.objects.create(
                user=user,
                consent_type=UserConsent.ConsentType.MARKETING,
                ip_address=ip,
            )

        tokens = get_tokens_for_user(user)
        return Response({
            **tokens,
            'user': UserProfileSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def telegram_auth(request):
    """
    Авторизация через Telegram Web App.
    
    Expects JSON:
    {
        "init_data": "query_id=..&user=..&hash=..."
    }
    
    Returns:
    {
        "access": "jwt_token",
        "refresh": "refresh_token",
        "user": {...}
    }
    """
    serializer = TelegramAuthSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user_data = serializer.validated_data
    telegram_id = user_data.get('telegram_id')
    
    if not telegram_id:
        return Response(
            {'detail': 'Не удалось получить Telegram ID'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Пытаемся найти существующего пользователя
    try:
        user = User.objects.get(telegram_id=telegram_id)
    except User.DoesNotExist:
        # Не создаём пользователя — возвращаем pending_link
        social_token = create_social_token(
            provider='telegram',
            social_id=telegram_id,
            extra_data={
                'first_name': user_data.get('first_name', ''),
                'last_name': user_data.get('last_name', ''),
            },
        )
        return Response({
            'status': 'pending_link',
            'social_token': social_token,
            'provider': 'telegram',
            'social_name': user_data.get('first_name', ''),
        }, status=status.HTTP_200_OK)

    # Обновляем имя и фамилию если они изменились
    user.first_name = user_data.get('first_name', user.first_name)
    user.last_name = user_data.get('last_name', user.last_name)
    user.save()

    tokens = get_tokens_for_user(user)
    return Response({
        'status': 'authenticated',
        **tokens,
        'user': UserProfileSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def telegram_widget_auth(request):
    """
    Авторизация через Telegram Login Widget (для веб-браузера).

    Telegram Login Widget отправляет: id, first_name, last_name,
    username, photo_url, auth_date, hash.

    Верификация: SHA256(bot_token) -> secret_key,
    затем HMAC-SHA256(data_check_string, secret_key) == hash.
    """
    data = request.data.copy()

    received_hash = data.pop('hash', None)
    if not received_hash:
        return Response(
            {'detail': 'Hash отсутствует в данных'},
            status=status.HTTP_400_BAD_REQUEST
        )

    telegram_id = data.get('id')
    if not telegram_id:
        return Response(
            {'detail': 'Telegram ID отсутствует'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Проверяем свежесть auth_date (не старше 24 часов)
    auth_date = data.get('auth_date')
    if auth_date and (time.time() - int(auth_date)) > 86400:
        return Response(
            {'detail': 'Данные авторизации устарели'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Строим check_string: все поля кроме hash, отсортированные по ключу
    check_string = '\n'.join(
        f'{key}={data[key]}'
        for key in sorted(data.keys())
    )

    # Для Login Widget: secret_key = SHA256(bot_token)
    secret_key = hashlib.sha256(
        settings.TELEGRAM_BOT_TOKEN.encode()
    ).digest()

    computed_hash = hmac.new(
        secret_key,
        check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if computed_hash != received_hash:
        return Response(
            {'detail': 'Неверная подпись Telegram'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Ищем пользователя
    try:
        user = User.objects.get(telegram_id=telegram_id)
    except User.DoesNotExist:
        # Не создаём пользователя — возвращаем pending_link
        social_token = create_social_token(
            provider='telegram',
            social_id=telegram_id,
            extra_data={
                'first_name': data.get('first_name', ''),
                'last_name': data.get('last_name', ''),
            },
        )
        return Response({
            'status': 'pending_link',
            'social_token': social_token,
            'provider': 'telegram',
            'social_name': data.get('first_name', ''),
        }, status=status.HTTP_200_OK)

    # Обновляем имя если изменилось
    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.save()

    tokens = get_tokens_for_user(user)
    return Response({
        'status': 'authenticated',
        **tokens,
        'user': UserProfileSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Получить профиль текущего пользователя."""
    serializer = UserProfileSerializer(request.user, context={'request': request})
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def user_profile_update(request):
    """Обновить профиль текущего пользователя."""
    user = request.user
    serializer = UserProfileSerializer(user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Авторизация через Google Sign-In.

    Expects JSON: { "credential": "<Google ID token>" }
    Returns JWT tokens + user profile.

    Only works for existing users (registered via phone).
    Matches by google_id or email.
    """
    credential = request.data.get('credential')
    if not credential:
        return Response(
            {'detail': 'Credential отсутствует'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        return Response(
            {'detail': 'Неверный Google токен'},
            status=status.HTTP_400_BAD_REQUEST
        )

    google_id = idinfo['sub']
    email = idinfo.get('email')
    first_name = idinfo.get('given_name', '')
    last_name = idinfo.get('family_name', '')

    # Поиск пользователя: сначала по google_id, потом по email
    user = User.objects.filter(google_id=google_id).first()
    if not user and email:
        user = User.objects.filter(email=email).first()

    if not user:
        # Не найден — возвращаем pending_link вместо 404
        social_token = create_social_token(
            provider='google',
            social_id=google_id,
            extra_data={
                'email': email or '',
                'first_name': first_name,
                'last_name': last_name,
            },
        )
        return Response({
            'status': 'pending_link',
            'social_token': social_token,
            'provider': 'google',
            'social_name': first_name,
            'social_email': email or '',
        }, status=status.HTTP_200_OK)

    # Привязываем google_id и email если ещё не привязаны
    updated = False
    if not user.google_id:
        user.google_id = google_id
        updated = True
    if not user.email and email:
        user.email = email
        updated = True
    if not user.first_name and first_name:
        user.first_name = first_name
        updated = True
    if not user.last_name and last_name:
        user.last_name = last_name
        updated = True
    if updated:
        user.save()

    tokens = get_tokens_for_user(user)
    return Response({
        'status': 'authenticated',
        **tokens,
        'user': UserProfileSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def link_account(request):
    """
    Привязка соц-аккаунта к существующему аккаунту (phone+password).

    Expects JSON:
    {
        "social_token": "signed_token",
        "phone": "+998901234567",
        "password": "password123"
    }
    """
    social_token = request.data.get('social_token')
    if not social_token:
        return Response(
            {'detail': 'social_token обязателен'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    social_data = verify_social_token(social_token)
    if not social_data:
        return Response(
            {'detail': 'Токен истёк или недействителен. Попробуйте войти заново.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = AccountLinkSerializer(
        data=request.data, context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']

    provider = social_data['provider']
    social_id = social_data['social_id']
    extra = social_data.get('extra', {})

    # Проверяем что social_id не привязан к другому аккаунту
    if provider == 'telegram':
        if User.objects.filter(telegram_id=social_id).exclude(pk=user.pk).exists():
            return Response(
                {'detail': 'Этот Telegram аккаунт уже привязан к другому пользователю'},
                status=status.HTTP_409_CONFLICT,
            )
        user.telegram_id = int(social_id)
    elif provider == 'google':
        if User.objects.filter(google_id=social_id).exclude(pk=user.pk).exists():
            return Response(
                {'detail': 'Этот Google аккаунт уже привязан к другому пользователю'},
                status=status.HTTP_409_CONFLICT,
            )
        user.google_id = social_id
        if not user.email and extra.get('email'):
            user.email = extra['email']

    user.save()

    tokens = get_tokens_for_user(user)
    return Response({
        'status': 'authenticated',
        **tokens,
        'user': UserProfileSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def social_register(request):
    """
    Регистрация нового аккаунта через соц-вход.

    Expects JSON:
    {
        "social_token": "signed_token",
        "phone": "+998901234567",
        "password": "password123",
        "first_name": "John",
        "last_name": "Doe"
    }
    """
    social_token = request.data.get('social_token')
    if not social_token:
        return Response(
            {'detail': 'social_token обязателен'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    social_data = verify_social_token(social_token)
    if not social_data:
        return Response(
            {'detail': 'Токен истёк или недействителен. Попробуйте войти заново.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    phone = request.data.get('phone')
    password = request.data.get('password')

    if not phone or not password:
        return Response(
            {'detail': 'Телефон и пароль обязательны'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(password) < 6:
        return Response(
            {'detail': 'Пароль должен быть минимум 6 символов'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(phone=phone).exists():
        return Response(
            {'detail': 'Пользователь с таким номером уже существует. Попробуйте привязать аккаунт.'},
            status=status.HTTP_409_CONFLICT,
        )

    provider = social_data['provider']
    social_id = social_data['social_id']
    extra = social_data.get('extra', {})

    first_name = request.data.get('first_name') or extra.get('first_name', '')
    last_name = request.data.get('last_name') or extra.get('last_name', '')

    extra_fields = {
        'first_name': first_name,
        'last_name': last_name,
        'role': User.Role.STUDENT,
    }

    if provider == 'telegram':
        extra_fields['telegram_id'] = int(social_id)
    elif provider == 'google':
        extra_fields['google_id'] = social_id
        if extra.get('email'):
            extra_fields['email'] = extra['email']

    user = User.objects.create_user(
        phone=phone,
        password=password,
        **extra_fields,
    )

    tokens = get_tokens_for_user(user)
    return Response({
        'status': 'authenticated',
        **tokens,
        'user': UserProfileSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_phone(request):
    """
    Обновить телефон для пользователей с фейковым номером (legacy соц-аккаунты).

    Expects JSON:
    {
        "phone": "+998901234567",
        "password": "newpassword123"
    }
    """
    user = request.user
    phone_str = str(user.phone) if user.phone else ''

    if phone_str.startswith('+998'):
        return Response(
            {'detail': 'У вас уже указан настоящий номер телефона'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    phone = request.data.get('phone')
    password = request.data.get('password')

    if not phone:
        return Response(
            {'detail': 'Номер телефона обязателен'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(phone=phone).exclude(pk=user.pk).exists():
        return Response(
            {'detail': 'Этот номер уже используется другим аккаунтом'},
            status=status.HTTP_409_CONFLICT,
        )

    user.phone = phone
    if password and len(password) >= 6:
        user.set_password(password)
    user.save()

    tokens = get_tokens_for_user(user)
    return Response({
        **tokens,
        'user': UserProfileSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """Обновить access token используя refresh token."""
    from rest_framework_simplejwt.views import TokenRefreshView
    return TokenRefreshView.as_view()(request)


class SingleSessionTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Кастомный serializer для phone+password логина с single-session."""

    @classmethod
    def get_token(cls, user):
        user.token_version += 1
        user.save(update_fields=['token_version'])

        token = super().get_token(user)
        token['token_version'] = user.token_version
        return token


class SingleSessionTokenObtainPairView(TokenObtainPairView):
    serializer_class = SingleSessionTokenObtainPairSerializer


class SingleSessionTokenRefreshSerializer(TokenRefreshSerializer):
    """Проверяет token_version перед обновлением токена."""

    def validate(self, attrs):
        try:
            payload = pyjwt.decode(
                attrs['refresh'],
                options={'verify_signature': False, 'verify_exp': False},
            )
            tv = payload.get('token_version')
            uid = payload.get('user_id')
            if uid is not None and tv is not None:
                user = User.objects.get(id=uid)
                if tv != user.token_version:
                    raise InvalidToken('Сессия недействительна. Войдите заново.')
        except User.DoesNotExist:
            raise InvalidToken('Пользователь не найден.')
        except InvalidToken:
            raise
        except Exception:
            pass
        return super().validate(attrs)


class SingleSessionTokenRefreshView(TokenRefreshView):
    serializer_class = SingleSessionTokenRefreshSerializer


# ─── Trainer Dashboard ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trainer_dashboard(request):
    """Статистика дашборда тренера."""
    user = request.user
    if user.role != User.Role.TRAINER:
        return Response({'detail': 'Доступно только для тренеров'}, status=status.HTTP_403_FORBIDDEN)

    try:
        trainer = user.trainer_profile
    except Trainer.DoesNotExist:
        return Response({'detail': 'Профиль тренера не найден'}, status=status.HTTP_404_NOT_FOUND)

    from enrollments.models import Enrollment

    courses = trainer.courses.all()
    enrollments_qs = Enrollment.objects.filter(course__trainer=trainer)

    total_courses = courses.count()
    total_students = enrollments_qs.values('user').distinct().count()
    active_students = enrollments_qs.filter(is_active=True).values('user').distinct().count()
    total_revenue = enrollments_qs.aggregate(total=Sum('amount_paid'))['total'] or 0

    return Response({
        'total_courses': total_courses,
        'total_students': total_students,
        'active_students': active_students,
        'total_revenue': str(total_revenue),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trainer_courses(request):
    """Список курсов тренера (включая черновики)."""
    user = request.user
    if user.role != User.Role.TRAINER:
        return Response({'detail': 'Доступно только для тренеров'}, status=status.HTTP_403_FORBIDDEN)

    try:
        trainer = user.trainer_profile
    except Trainer.DoesNotExist:
        return Response({'detail': 'Профиль тренера не найден'}, status=status.HTTP_404_NOT_FOUND)

    courses = trainer.courses.select_related('category').order_by('-created_at')
    serializer = TrainerCourseManageSerializer(courses, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def trainer_course_toggle_status(request, pk):
    """Переключить статус курса (опубликован/черновик)."""
    user = request.user
    if user.role != User.Role.TRAINER:
        return Response({'detail': 'Доступно только для тренеров'}, status=status.HTTP_403_FORBIDDEN)

    try:
        trainer = user.trainer_profile
    except Trainer.DoesNotExist:
        return Response({'detail': 'Профиль тренера не найден'}, status=status.HTTP_404_NOT_FOUND)

    from courses.models import Course

    try:
        course = trainer.courses.get(pk=pk)
    except Course.DoesNotExist:
        return Response({'detail': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

    if course.status == Course.Status.PENDING_REVIEW:
        return Response(
            {'detail': 'Курс на проверке у администратора. Дождитесь одобрения.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if course.status == Course.Status.PUBLISHED:
        course.status = Course.Status.DRAFT
        course.save(update_fields=['status', 'updated_at'])
    elif course.status == Course.Status.REVISION_REQUIRED:
        # Trainer resubmits after fixing issues → clear revision notes
        if not trainer.is_verified:
            return Response(
                {'detail': 'Для публикации курсов необходима верификация аккаунта'},
                status=status.HTTP_403_FORBIDDEN,
            )
        course.status = Course.Status.PENDING_REVIEW
        course.revision_notes = ''
        course.save(update_fields=['status', 'revision_notes', 'updated_at'])
    else:
        # draft → pending_review
        if not trainer.is_verified:
            return Response(
                {'detail': 'Для публикации курсов необходима верификация аккаунта'},
                status=status.HTTP_403_FORBIDDEN,
            )
        course.status = Course.Status.PENDING_REVIEW
        course.save(update_fields=['status', 'updated_at'])

    return Response({'status': course.status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trainer_course_delete_request(request, pk):
    """Удаление черновика сразу, опубликованного курса — через запрос админу."""
    user = request.user
    if user.role != User.Role.TRAINER:
        return Response({'detail': 'Доступно только для тренеров'}, status=status.HTTP_403_FORBIDDEN)

    try:
        trainer = user.trainer_profile
    except Trainer.DoesNotExist:
        return Response({'detail': 'Профиль тренера не найден'}, status=status.HTTP_404_NOT_FOUND)

    from courses.models import Course

    try:
        course = trainer.courses.get(pk=pk)
    except Course.DoesNotExist:
        return Response({'detail': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

    if course.status == Course.Status.DRAFT:
        course.delete()
        return Response({'detail': 'Курс удалён'}, status=status.HTTP_204_NO_CONTENT)

    course.deletion_requested = True
    course.save(update_fields=['deletion_requested', 'updated_at'])
    return Response({'detail': 'Запрос на удаление отправлен администратору'})


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def trainer_profile_update(request):
    """Обновить профиль тренера (сертификаты, био и т.д.)."""
    user = request.user
    if user.role != User.Role.TRAINER:
        return Response({'detail': 'Доступно только для тренеров'}, status=status.HTTP_403_FORBIDDEN)

    try:
        trainer = user.trainer_profile
    except Trainer.DoesNotExist:
        return Response({'detail': 'Профиль тренера не найден'}, status=status.HTTP_404_NOT_FOUND)

    serializer = TrainerProfileUpdateSerializer(trainer, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ─── Social Account Disconnect ────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_telegram(request):
    """Отвязать Telegram аккаунт."""
    user = request.user
    if not user.telegram_id:
        return Response({'detail': 'Telegram не привязан'}, status=status.HTTP_400_BAD_REQUEST)
    user.telegram_id = None
    user.save(update_fields=['telegram_id', 'updated_at'])
    return Response({'detail': 'Telegram отвязан'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_google(request):
    """Отвязать Google аккаунт."""
    user = request.user
    if not user.google_id:
        return Response({'detail': 'Google не привязан'}, status=status.HTTP_400_BAD_REQUEST)
    user.google_id = None
    user.email = None
    user.save(update_fields=['google_id', 'email', 'updated_at'])
    return Response({'detail': 'Google отвязан'})


# ─── Social Account Linking (from profile) ────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_telegram_profile(request):
    """
    Привязать Telegram аккаунт из профиля.
    Принимает данные от Telegram Login Widget (id, first_name, hash, auth_date, ...).
    """
    data = request.data.copy()
    user = request.user

    if user.telegram_id:
        return Response({'detail': 'Telegram уже привязан'}, status=status.HTTP_400_BAD_REQUEST)

    received_hash = data.pop('hash', None)
    if not received_hash:
        return Response({'detail': 'Hash отсутствует в данных'}, status=status.HTTP_400_BAD_REQUEST)

    telegram_id = data.get('id')
    if not telegram_id:
        return Response({'detail': 'Telegram ID отсутствует'}, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем свежесть auth_date
    import time
    auth_date = data.get('auth_date')
    if auth_date and (time.time() - int(auth_date)) > 86400:
        return Response({'detail': 'Данные авторизации устарели'}, status=status.HTTP_400_BAD_REQUEST)

    # Верификация подписи (Login Widget)
    check_string = '\n'.join(
        f'{key}={data[key]}'
        for key in sorted(data.keys())
    )

    secret_key = hashlib.sha256(settings.TELEGRAM_BOT_TOKEN.encode()).digest()
    computed_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

    if computed_hash != received_hash:
        return Response({'detail': 'Неверная подпись Telegram'}, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем что этот telegram_id не привязан к другому
    if User.objects.filter(telegram_id=telegram_id).exclude(pk=user.pk).exists():
        return Response(
            {'detail': 'Этот Telegram аккаунт уже привязан к другому пользователю'},
            status=status.HTTP_409_CONFLICT,
        )

    user.telegram_id = int(telegram_id)
    user.save(update_fields=['telegram_id', 'updated_at'])
    return Response({'detail': 'Telegram привязан', 'telegram_id': user.telegram_id})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_google_profile(request):
    """
    Привязать Google аккаунт из профиля.
    Принимает { "credential": "<Google ID token>" }.
    """
    user = request.user

    if user.google_id:
        return Response({'detail': 'Google уже привязан'}, status=status.HTTP_400_BAD_REQUEST)

    credential = request.data.get('credential')
    if not credential:
        return Response({'detail': 'Credential отсутствует'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        return Response({'detail': 'Неверный Google токен'}, status=status.HTTP_400_BAD_REQUEST)

    google_id = idinfo['sub']
    email = idinfo.get('email')

    # Проверяем что google_id не привязан к другому
    if User.objects.filter(google_id=google_id).exclude(pk=user.pk).exists():
        return Response(
            {'detail': 'Этот Google аккаунт уже привязан к другому пользователю'},
            status=status.HTTP_409_CONFLICT,
        )

    user.google_id = google_id
    if email and not user.email:
        user.email = email
    user.save(update_fields=['google_id', 'email', 'updated_at'])
    return Response({'detail': 'Google привязан', 'google_id': user.google_id, 'email': user.email})


# ─── Avatar Upload ────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """
    Загрузить фото профиля на Google Drive (публичный доступ).
    Принимает multipart/form-data с полем 'avatar'.
    """
    import io
    from django.conf import settings
    from storage.views import _get_drive_service

    user = request.user
    avatar_file = request.FILES.get('avatar')

    if not avatar_file:
        return Response({'detail': 'Файл не найден'}, status=status.HTTP_400_BAD_REQUEST)

    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if avatar_file.content_type not in allowed_types:
        return Response(
            {'detail': 'Допустимые форматы: JPEG, PNG, WebP'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if avatar_file.size > 5 * 1024 * 1024:
        return Response(
            {'detail': 'Максимальный размер файла — 5 МБ'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from googleapiclient.http import MediaIoBaseUpload

        drive_service = _get_drive_service()
        folder_id = settings.GDRIVE_FOLDER_ID

        file_metadata = {'name': f'avatar_{user.id}_{avatar_file.name}'}
        if folder_id:
            file_metadata['parents'] = [folder_id]

        media = MediaIoBaseUpload(
            io.BytesIO(avatar_file.read()),
            mimetype=avatar_file.content_type,
            resumable=True,
        )
        uploaded = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id',
            supportsAllDrives=True,
        ).execute()

        gdrive_id = uploaded['id']

        # Открываем публичный доступ
        drive_service.permissions().create(
            fileId=gdrive_id,
            body={'type': 'anyone', 'role': 'reader'},
        ).execute()

        avatar_url = f'https://lh3.googleusercontent.com/d/{gdrive_id}'

    except Exception as exc:
        return Response(
            {'detail': f'Ошибка загрузки: {str(exc)}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    user.avatar_url = avatar_url
    user.save(update_fields=['avatar_url', 'updated_at'])

    return Response({'detail': 'Фото обновлено', 'avatar_url': avatar_url})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Смена пароля.

    Если у пользователя уже есть пароль (вошёл по phone+password) —
    требуем current_password. Если пароля нет (вошёл только через Telegram/Google) —
    current_password не нужен.

    Expects JSON:
    {
        "current_password": "old_pass",  // обязателен если пароль уже установлен
        "new_password": "new_pass"       // мин. 6 символов
    }
    """
    user = request.user
    new_password = request.data.get('new_password', '')

    if len(new_password) < 6:
        return Response(
            {'detail': 'Новый пароль должен быть минимум 6 символов'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.has_usable_password():
        current_password = request.data.get('current_password', '')
        if not current_password:
            return Response(
                {'detail': 'Текущий пароль обязателен'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.check_password(current_password):
            return Response(
                {'detail': 'Неверный текущий пароль'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    user.set_password(new_password)
    # Инвалидируем все остальные сессии
    user.token_version += 1
    user.save(update_fields=['password', 'token_version', 'updated_at'])

    tokens = get_tokens_for_user(user)
    return Response({
        'detail': 'Пароль успешно изменён',
        **tokens,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_avatar(request):
    """Удалить фото профиля."""
    from storage.views import _get_drive_service

    user = request.user
    if not user.avatar_url:
        return Response({'detail': 'Фото не найдено'}, status=status.HTTP_400_BAD_REQUEST)

    # Извлекаем gdrive_id из URL вида https://lh3.googleusercontent.com/d/{id}
    gdrive_id = user.avatar_url.split('/d/')[-1] if '/d/' in user.avatar_url else None
    if gdrive_id:
        try:
            drive_service = _get_drive_service()
            drive_service.files().delete(fileId=gdrive_id).execute()
        except Exception:
            pass

    user.avatar_url = ''
    user.save(update_fields=['avatar_url', 'updated_at'])
    return Response({'detail': 'Фото удалено'})

