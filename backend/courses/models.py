import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from users.models import User, Trainer
from storage.models import VimeoVideo, GoogleDriveFile


class Category(models.Model):
    """Категория курсов."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField('Название (RU)', max_length=100)
    title_uz = models.CharField('Название (UZ)', max_length=100, blank=True)
    slug = models.SlugField('Slug (URL)', max_length=50, unique=True)
    description = models.TextField('Описание (RU)')
    description_uz = models.TextField('Описание (UZ)', blank=True)
    icon_url = models.URLField('Иконка/Фон', max_length=500, blank=True)
    order = models.PositiveSmallIntegerField('Порядок', default=0)
    is_active = models.BooleanField('Активна', default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['order', 'title']
    
    def __str__(self):
        return self.title


class Course(models.Model):
    """Курс тренера."""
    
    class Level(models.TextChoices):
        BEGINNER = 'beginner', 'Новичок'
        INTERMEDIATE = 'intermediate', 'Средний'
        ADVANCED = 'advanced', 'Продвинутый'
    
    class Format(models.TextChoices):
        HOME = 'home', 'Дома'
        GYM = 'gym', 'В зале'
        MIXED = 'mixed', 'Смешанный'
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Черновик'
        PENDING_REVIEW = 'pending_review', 'На проверке'
        REVISION_REQUIRED = 'revision_required', 'На доработке'
        PUBLISHED = 'published', 'Опубликован'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.CASCADE,
        related_name='courses',
        verbose_name='Тренер'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='courses',
        verbose_name='Категория'
    )
    
    title = models.CharField('Название (RU)', max_length=200)
    title_uz = models.CharField('Название (UZ)', max_length=200, blank=True)
    cover_url = models.URLField('Обложка курса (URL)', max_length=500, blank=True)
    short_description = models.CharField(
        'Краткое описание (RU)',
        max_length=500,
        help_text='1-2 предложения об основном результате курса'
    )
    short_description_uz = models.CharField(
        'Краткое описание (UZ)',
        max_length=500,
        blank=True,
    )
    full_description = models.TextField(
        'Полное описание (RU)',
        blank=True,
        help_text='Поддерживает Markdown'
    )
    full_description_uz = models.TextField(
        'Полное описание (UZ)',
        blank=True,
    )
    
    level = models.CharField(
        'Уровень',
        max_length=20,
        choices=Level.choices,
        default=Level.BEGINNER
    )
    format = models.CharField(
        'Формат',
        max_length=20,
        choices=Format.choices,
        default=Format.HOME
    )
    equipment = models.TextField(
        'Оборудование',
        blank=True,
        help_text='Необходимое оборудование для курса'
    )
    target_weight_range = models.CharField(
        'Диапазон веса',
        max_length=50,
        blank=True,
        help_text='Для какого веса предназначен курс'
    )
    language = models.CharField(
        'Язык',
        max_length=10,
        default='ru',
        help_text='Код языка: ru, uz, en'
    )
    
    price = models.DecimalField(
        'Цена (UZS)',
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(300000)]
    )
    duration_weeks = models.PositiveSmallIntegerField(
        'Длительность (недель)',
        default=4
    )
    
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    
    requirements = models.TextField(
        'Требования к ученику',
        blank=True
    )
    goals_text = models.TextField(
        'Цель курса',
        blank=True,
        help_text='Цель в виде текста от тренера (Markdown)'
    )
    
    deletion_requested = models.BooleanField(
        'Запрос на удаление',
        default=False,
        help_text='Тренер запросил удаление, ожидает подтверждения админа'
    )
    deletion_confirmed_at = models.DateTimeField(
        'Начало переходного периода',
        null=True,
        blank=True,
        help_text='Дата подтверждения удаления администратором. Курс удаляется через 90 дней.'
    )

    # Денормализованные поля для производительности
    purchases_count = models.PositiveIntegerField('Количество покупок', default=0)
    rating = models.DecimalField(
        'Рейтинг',
        max_digits=2,
        decimal_places=1,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    
    revision_notes = models.TextField('Замечания администратора', blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField('Дата публикации', null=True, blank=True)
    
    class Meta:
        db_table = 'courses'
        verbose_name = 'Курс'
        verbose_name_plural = 'Курсы'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trainer']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['category', 'status']),
        ]
    
    def __str__(self):
        return self.title
    
    @property
    def primary_module(self):
        """Возвращает основной модуль курса (с приоритетом 5)."""
        return self.modules.filter(is_primary=True).first()


class CourseModule(models.Model):
    """Модуль курса (тренировки, теория, питание, восстановление)."""
    
    class ModuleType(models.TextChoices):
        TRAINING = 'training', 'Тренировки'
        THEORY = 'theory', 'Теория'
        NUTRITION = 'nutrition', 'Питание'
        RECOVERY = 'recovery', 'Восстановление'
        SPORTS_NUTRITION = 'sports_nutrition', 'Спортивное питание'
        TRAINING_NUANCES = 'training_nuances', 'Нюансы тренировок'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='modules',
        verbose_name='Курс'
    )
    type = models.CharField(
        'Тип модуля',
        max_length=20,
        choices=ModuleType.choices
    )
    priority = models.PositiveSmallIntegerField(
        'Приоритет',
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        help_text='От 0 до 5, 5 = основной модуль'
    )
    is_primary = models.BooleanField(
        'Основной модуль',
        default=False,
        help_text='Автоматически true если priority=5'
    )
    # Если один из модулей НЕ заполнен, то нужно исключить его показ пользователю - для этого используем поле is_filled
    is_filled = models.BooleanField(
        'Заполнен',
        default=False,
        help_text='Есть ли контент в модуле'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'course_modules'
        verbose_name = 'Модуль курса'
        verbose_name_plural = 'Модули курсов'
        ordering = ['course__title']
        constraints = [
            # Уникальный тип модуля в курсе
            models.UniqueConstraint(
                fields=['course', 'type'],
                name='unique_module_type_per_course'
            ),
            # Уникальный приоритет в курсе
            models.UniqueConstraint(
                fields=['course', 'priority'],
                name='unique_priority_per_course'
            ),
        ]
        indexes = [
            models.Index(fields=['course', 'type']),
        ]
    
    def __str__(self):
        return f"{self.course.title} - {self.get_type_display()} ({self.priority}⭐)"
    
    def clean(self):
        """Валидация: только один primary модуль на курс."""
        if self.is_primary:
            existing = CourseModule.objects.filter(
                course=self.course,
                is_primary=True
            ).exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError('Курс уже имеет основной модуль')
    
    def save(self, *args, **kwargs):
        # Автоматически устанавливаем is_primary если priority=5
        self.is_primary = (self.priority == 5)
        self.full_clean()
        super().save(*args, **kwargs)


class ModuleContent(models.Model):
    """
    Контент модуля (для Theory, Nutrition, Recovery).
    НЕ используется для Training — у него календарная структура.
    """
    
    class ContentType(models.TextChoices):
        VIDEO = 'video', 'Видео'
        PDF = 'pdf', 'PDF'
        IMAGE = 'image', 'Изображение'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(
        CourseModule,
        on_delete=models.CASCADE,
        related_name='contents',
        verbose_name='Модуль'
    )
    title = models.CharField('Название (RU)', max_length=255)
    title_uz = models.CharField('Название (UZ)', max_length=255, blank=True)
    order = models.PositiveSmallIntegerField('Порядок', default=0)

    vimeo_video = models.ForeignKey(
        VimeoVideo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='module_usages',
        verbose_name='Видео'
    )
    gdrive_file = models.ForeignKey(
        GoogleDriveFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='module_usages',
        verbose_name='Файл'
    )
    content_type = models.CharField(
        'Тип контента',
        max_length=20,
        choices=ContentType.choices
    )
    is_preview = models.BooleanField(
        'Доступно для предпросмотра',
        default=False,
        help_text='Показывать до покупки курса'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'module_contents'
        verbose_name = 'Контент модуля'
        verbose_name_plural = 'Контент модулей'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.module} - {self.title}"
    
    def clean(self):
        """Валидация: должен быть либо video, либо file."""
        if not self.vimeo_video and not self.gdrive_file:
            raise ValidationError('Должен быть указан видео или файл')
        if self.vimeo_video and self.gdrive_file:
            raise ValidationError('Нельзя указать и видео, и файл одновременно')
        

class Favorite(models.Model):
    """Избранные курсы пользователя."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorites',
        verbose_name='Пользователь'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='favorited_by',
        verbose_name='Курс'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'favorites'
        verbose_name = 'Избранное'
        verbose_name_plural = 'Избранное'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'course'],
                name='unique_favorite_per_user_course'
            ),
        ]
    
    def __str__(self):
        return f"{self.user} ❤ {self.course}"