from datetime import date
from rest_framework import serializers
from users.models import User, Trainer


def compute_experience_years(obj):
    if obj.career_start_year:
        return max(0, date.today().year - obj.career_start_year)
    return obj.experience_years


class TrainerCardSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    experience_years = serializers.SerializerMethodField()

    class Meta:
        model = Trainer
        fields = [
            'id', 'first_name', 'last_name',
            'bio', 'short_description',
            'specialization', 'experience_years', 'career_start_year',
            'certificates', 'photo_url', 'avatar_url',
            'instagram_url', 'intro_video_url',
            'is_verified', 'created_at', 'updated_at'
        ]

    def get_avatar_url(self, obj):
        return obj.user.avatar_url or None

    def get_experience_years(self, obj):
        return compute_experience_years(obj)


class TrainerDetailSerializer(TrainerCardSerializer):
    """Детальная информация о тренере с его курсами."""
    courses_count = serializers.SerializerMethodField()
    courses = serializers.SerializerMethodField()

    class Meta(TrainerCardSerializer.Meta):
        fields = TrainerCardSerializer.Meta.fields + ['courses_count', 'courses']

    def get_courses_count(self, obj):
        return obj.courses.filter(status='published').count()

    def get_courses(self, obj):
        from courses.serializers import CourseCardSerializer
        qs = obj.courses.filter(status='published').select_related('trainer__user')
        return CourseCardSerializer(qs, many=True).data


class TelegramAuthSerializer(serializers.Serializer):
    """Сериализатор для Telegram Web App авторизации."""
    
    init_data = serializers.CharField(
        help_text="initData из Telegram Web App"
    )
    
    def validate_init_data(self, value):
        """Валидация подписи Telegram и извлечение данных пользователя."""
        import hmac
        import hashlib
        import json
        from urllib.parse import parse_qs
        from django.conf import settings
        
        try:
            # Парсируем данные
            data = parse_qs(value)
            
            # Извлекаем подпись
            signature = data.get('hash', [''])[0]
            
            if not signature:
                raise serializers.ValidationError("Hash отсутствует в данных")
            
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
                raise serializers.ValidationError("Неверная подпись от Telegram")
            
            # Извлекаем user данные
            user_data_str = data.get('user', ['{}'])[0]
            user_data = json.loads(user_data_str)
            
            return {
                'telegram_id': user_data.get('id'),
                'first_name': user_data.get('first_name', ''),
                'last_name': user_data.get('last_name', ''),
                'username': user_data.get('username', ''),
                'photo_url': user_data.get('photo_url', ''),
            }
        except json.JSONDecodeError as e:
            raise serializers.ValidationError(f"Ошибка при парсинге данных Telegram: {str(e)}")
        except Exception as e:
            raise serializers.ValidationError(f"Ошибка при валидации Telegram данных: {str(e)}")


class TrainerProfileNestedSerializer(serializers.ModelSerializer):
    """Вложенный сериализатор профиля тренера (для UserProfileSerializer)."""
    experience_years = serializers.SerializerMethodField()

    class Meta:
        model = Trainer
        fields = [
            'id', 'bio', 'short_description', 'specialization',
            'experience_years', 'career_start_year', 'certificates', 'photo_url',
            'instagram_url', 'intro_video_url', 'is_verified',
        ]
        read_only_fields = fields

    def get_experience_years(self, obj):
        return compute_experience_years(obj)

    def get_avatar_url(self, obj):
        return obj.user.avatar_url or None


class UserProfileSerializer(serializers.ModelSerializer):
    """Сериализатор профиля пользователя."""

    full_name = serializers.CharField(read_only=True)
    is_profile_complete = serializers.BooleanField(read_only=True)
    trainer_profile = TrainerProfileNestedSerializer(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'first_name', 'last_name', 'full_name',
            'age', 'gender', 'weight', 'role', 'telegram_id',
            'email', 'google_id', 'is_profile_complete',
            'is_active', 'created_at', 'updated_at',
            'trainer_profile', 'avatar_url',
        ]
        read_only_fields = ['id', 'phone', 'telegram_id', 'google_id', 'is_active', 'created_at', 'updated_at']

    def get_avatar_url(self, obj):
        return obj.avatar_url or None


class AccountLinkSerializer(serializers.Serializer):
    """Валидация phone+password для привязки соц-аккаунта."""
    phone = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        from django.contrib.auth import authenticate
        user = authenticate(
            request=self.context.get('request'),
            phone=attrs['phone'],
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Неверный номер телефона или пароль')
        if not user.is_active:
            raise serializers.ValidationError('Аккаунт деактивирован')
        attrs['user'] = user
        return attrs


class TrainerProfileUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления профиля тренера."""

    class Meta:
        model = Trainer
        fields = [
            'bio', 'short_description', 'specialization',
            'career_start_year', 'certificates', 'photo_url',
            'instagram_url', 'intro_video_url',
        ]


class TrainerCourseManageSerializer(serializers.Serializer):
    """Сериализатор курсов тренера для дашборда."""
    id = serializers.UUIDField()
    title = serializers.CharField()
    category_name = serializers.SerializerMethodField()
    status = serializers.CharField()
    purchases_count = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    deletion_requested = serializers.BooleanField()
    created_at = serializers.DateTimeField()

    def get_category_name(self, obj):
        return obj.category.title if obj.category else ''


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации нового пользователя."""

    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(
        choices=User.Role.choices,
        default=User.Role.STUDENT
    )

    class Meta:
        model = User
        fields = ['phone', 'password', 'first_name', 'last_name', 'role']

    def create(self, validated_data):
        """Создаём пользователя с хешированным паролем."""
        trainer_data = validated_data.pop('trainer_data', {})
        phone = validated_data['phone']
        password = validated_data['password']
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')
        role = validated_data.get('role', User.Role.STUDENT)

        # Проверяем, не существует ли уже пользователь с таким номером
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({'phone': ['Пользователь с таким номером уже существует']})

        # Создаём пользователя
        user = User.objects.create_user(
            phone=phone,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
        )

        # Если тренер — создаём профиль тренера с доп. полями
        if role == User.Role.TRAINER:
            from users.models import Trainer
            Trainer.objects.create(
                user=user,
                specialization=trainer_data.get('specialization', ''),
                career_start_year=trainer_data.get('career_start_year') or None,
                short_description=trainer_data.get('short_description', ''),
                bio=trainer_data.get('bio', ''),
            )

        return user
