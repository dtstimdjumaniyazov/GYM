import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from phonenumber_field.modelfields import PhoneNumberField

class UserManager(BaseUserManager):
    """Кастомный менеджер для User с аутентификацией по телефону."""
    
    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError('Номер телефона обязателен')
        user = self.model(phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.TRAINER)
        return self.create_user(phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Пользователь платформы (ученик или тренер)."""
    
    class Role(models.TextChoices):
        STUDENT = 'student', 'Ученик'
        TRAINER = 'trainer', 'Тренер'
    
    class Gender(models.TextChoices):
        MALE = 'male', 'Мужской'
        FEMALE = 'female', 'Женский'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = PhoneNumberField('Номер телефона', unique=True, region='UZ')
    first_name = models.CharField('Имя', max_length=100, blank=True)
    last_name = models.CharField('Фамилия', max_length=100, blank=True)
    age = models.PositiveSmallIntegerField('Возраст', null=True, blank=True)
    gender = models.CharField(
        'Пол', 
        max_length=10, 
        choices=Gender.choices, 
        blank=True
    )
    weight = models.DecimalField(
        'Вес (кг)', 
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    role = models.CharField(
        'Роль', 
        max_length=20, 
        choices=Role.choices, 
        default=Role.STUDENT
    )
    telegram_id = models.BigIntegerField(
        'Telegram ID',
        unique=True,
        null=True,
        blank=True
    )
    email = models.EmailField('Email', unique=True, null=True, blank=True)
    google_id = models.CharField('Google ID', max_length=255, unique=True, null=True, blank=True)
    avatar = models.ImageField(
        'Фото профиля',
        upload_to='avatars/',
        blank=True,
        null=True,
    )

    token_version = models.PositiveIntegerField('Версия токена', default=0)

    is_active = models.BooleanField('Активен', default=True)
    is_staff = models.BooleanField('Доступ в админку', default=False)
    
    created_at = models.DateTimeField('Дата регистрации', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
    def __str__(self):
        phone_str = str(self.phone) if self.phone else ''
        return f"{self.first_name} {self.last_name}".strip() or phone_str
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_profile_complete(self):
        """Профиль заполнен, если есть имя, фамилия и реальный UZ-номер."""
        phone_str = str(self.phone) if self.phone else ''
        has_real_phone = phone_str.startswith('+998')
        return bool(self.first_name and self.last_name and has_real_phone)


class UserConsent(models.Model):
    """Запись о согласии пользователя с документами платформы."""

    class ConsentType(models.TextChoices):
        REGISTRATION = 'registration', 'Пользовательское соглашение + Политика конфиденциальности'
        PRIVACY = 'privacy', 'Обработка персональных данных'
        MARKETING = 'marketing', 'Маркетинговые уведомления'
        MEDICAL = 'medical', 'Медицинский дисклеймер'
        PAYMENT_RULES = 'payment_rules', 'Правила оплаты и возврата'
        TRAINER_AGREEMENT = 'trainer_agreement', 'Договор-оферта для тренеров'

    class Method(models.TextChoices):
        CHECKBOX = 'checkbox', 'Чекбокс'
        MODAL = 'modal', 'Модальное окно'
        IMPLICIT = 'implicit', 'Конклюдентное действие'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='consents',
        verbose_name='Пользователь'
    )
    consent_type = models.CharField(
        'Тип согласия',
        max_length=20,
        choices=ConsentType.choices
    )
    document_version = models.CharField('Версия документа', max_length=20, default='1.0')
    granted = models.BooleanField('Согласие дано', default=True)
    granted_at = models.DateTimeField('Дата согласия', auto_now_add=True)
    revoked_at = models.DateTimeField('Дата отзыва', null=True, blank=True)
    ip_address = models.GenericIPAddressField('IP-адрес', null=True, blank=True)
    method = models.CharField(
        'Способ получения',
        max_length=20,
        choices=Method.choices,
        default=Method.CHECKBOX
    )

    class Meta:
        db_table = 'user_consents'
        verbose_name = 'Согласие пользователя'
        verbose_name_plural = 'Согласия пользователей'
        indexes = [
            models.Index(fields=['user', 'consent_type']),
        ]

    def __str__(self):
        return f"{self.user} — {self.get_consent_type_display()}"


class Trainer(models.Model):
    """Профиль тренера (расширение User)."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='trainer_profile',
        verbose_name='Пользователь'
    )
    bio = models.TextField('О тренере', blank=True)
    short_description = models.CharField(
        'Краткое описание', 
        max_length=255, 
        blank=True,
        help_text='1-2 предложения о специализации'
    )
    specialization = models.CharField('Специализация', max_length=255, blank=True)
    experience_years = models.PositiveSmallIntegerField(
        'Стаж (лет)', 
        default=0
    )
    certificates = models.JSONField(
        'Сертификаты', 
        default=list, 
        blank=True,
        help_text='Список сертификатов в формате JSON'
    )
    photo_url = models.URLField('Фото профиля', max_length=500, blank=True)
    instagram_url = models.URLField('Instagram', max_length=500, blank=True)
    intro_video_url = models.URLField('Видео о себе', max_length=500, blank=True)
    is_verified = models.BooleanField('Верифицирован', default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trainers'
        verbose_name = 'Тренер'
        verbose_name_plural = 'Тренеры'
    
    def __str__(self):
        return f"Тренер: {self.user.full_name or self.user.phone}"
    
    @property
    def courses_count(self):
        return self.courses.filter(status=Course.Status.PUBLISHED).count()