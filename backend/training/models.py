import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from courses.models import Course
from storage.models import VimeoVideo, GoogleDriveFile

# Create your models here.
class TrainingVariant(models.Model):
    """Вариант расписания тренировок (до 3 на курс)."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='training_variants',
        verbose_name='Курс'
    )
    variant_number = models.PositiveSmallIntegerField(
        'Номер варианта',
        validators=[MinValueValidator(1), MaxValueValidator(3)]
    )
    name = models.CharField(
        'Название (RU)',
        max_length=100,
        help_text='Например: "2 раза в неделю"'
    )
    name_uz = models.CharField(
        'Название (UZ)',
        max_length=100,
        blank=True,
    )
    description = models.CharField(
        'Описание (RU)',
        max_length=255,
        blank=True
    )
    description_uz = models.CharField(
        'Описание (UZ)',
        max_length=255,
        blank=True,
    )
    is_required = models.BooleanField(
        'Обязательный',
        default=False,
        help_text='Вариант 1 всегда обязателен'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'training_variants'
        verbose_name = 'Вариант тренировок'
        verbose_name_plural = 'Варианты тренировок'
        constraints = [
            models.UniqueConstraint(
                fields=['course', 'variant_number'],
                name='unique_variant_per_course'
            ),
            models.CheckConstraint(
                condition=models.Q(variant_number__gte=1, variant_number__lte=3),
                name='valid_variant_number'
            ),
        ]
        ordering = ['variant_number']
    
    def __str__(self):
        return f"{self.course.title} - Вариант {self.variant_number}: {self.name}"
    
    def save(self, *args, **kwargs):
        # Вариант 1 всегда обязателен
        if self.variant_number == 1:
            self.is_required = True
        super().save(*args, **kwargs)


class WeekSchedule(models.Model):
    """Неделя в расписании тренировок."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    variant = models.ForeignKey(
        TrainingVariant,
        on_delete=models.CASCADE,
        related_name='weeks',
        verbose_name='Вариант'
    )
    week_number = models.PositiveSmallIntegerField('Номер недели')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'week_schedules'
        verbose_name = 'Неделя'
        verbose_name_plural = 'Недели'
        constraints = [
            models.UniqueConstraint(
                fields=['variant', 'week_number'],
                name='unique_week_per_variant'
            ),
        ]
        ordering = ['week_number']
    
    def __str__(self):
        return f"{self.variant} - Неделя {self.week_number}"


class DaySchedule(models.Model):
    """День недели в расписании."""
    
    class DayOfWeek(models.IntegerChoices):
        MONDAY = 1, 'Понедельник'
        TUESDAY = 2, 'Вторник'
        WEDNESDAY = 3, 'Среда'
        THURSDAY = 4, 'Четверг'
        FRIDAY = 5, 'Пятница'
        SATURDAY = 6, 'Суббота'
        SUNDAY = 7, 'Воскресенье'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    week = models.ForeignKey(
        WeekSchedule,
        on_delete=models.CASCADE,
        related_name='days',
        verbose_name='Неделя'
    )
    day_of_week = models.PositiveSmallIntegerField(
        'День недели',
        choices=DayOfWeek.choices
    )
    is_rest_day = models.BooleanField('День отдыха', default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'day_schedules'
        verbose_name = 'День'
        verbose_name_plural = 'Дни'
        constraints = [
            models.UniqueConstraint(
                fields=['week', 'day_of_week'],
                name='unique_day_per_week'
            ),
        ]
        ordering = ['day_of_week']
    
    def __str__(self):
        return f"{self.week} - {self.get_day_of_week_display()}"


class DayContent(models.Model):
    """Контент тренировочного дня (видео и файлы)."""
    
    class ContentType(models.TextChoices):
        VIDEO = 'video', 'Видео'
        PDF = 'pdf', 'PDF'
        IMAGE = 'image', 'Изображение'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    day = models.ForeignKey(
        DaySchedule,
        on_delete=models.CASCADE,
        related_name='contents',
        verbose_name='День'
    )
    
    vimeo_video = models.ForeignKey(
        VimeoVideo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='day_usages',
        verbose_name='Видео'
    )
    gdrive_file = models.ForeignKey(
        GoogleDriveFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='day_usages',
        verbose_name='Файл'
    )
    
    order = models.PositiveSmallIntegerField(
        'Порядок',
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text='Порядок отображения (1-10)'
    )
    title = models.CharField('Название', max_length=255)
    content_type = models.CharField(
        'Тип контента',
        max_length=20,
        choices=ContentType.choices
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'day_contents'
        verbose_name = 'Контент дня'
        verbose_name_plural = 'Контент дней'
        ordering = ['content_type', 'order']
    
    def __str__(self):
        return f"{self.day} - {self.title}"
    
    def clean(self):
        """Валидация лимитов и типов контента."""
        if not self.vimeo_video and not self.gdrive_file:
            raise ValidationError('Должен быть указан видео или файл')
        if self.vimeo_video and self.gdrive_file:
            raise ValidationError('Нельзя указать и видео, и файл одновременно')
        
        # Проверка лимитов (10 видео + 10 файлов на день)
        if self.day_id:
            existing = DayContent.objects.filter(
                day=self.day,
                content_type=self.content_type
            ).exclude(pk=self.pk)
            if existing.count() >= 10:
                raise ValidationError(
                    f'Максимум 10 элементов типа {self.content_type} на день'
                )