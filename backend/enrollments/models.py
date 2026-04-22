import uuid
from django.db import models
from django.core.validators import MaxValueValidator
from django.core.exceptions import ValidationError
from users.models import User
from training.models import Course, TrainingVariant


class Enrollment(models.Model):
    """Покупка курса пользователем (создаётся после успешной оплаты)."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name='Пользователь'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name='enrollments',
        verbose_name='Курс'
    )
    variant = models.ForeignKey(
        TrainingVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollments',
        verbose_name='Выбранный вариант',
        help_text='Заполняется после выбора пользователем'
    )
    
    # Данные об оплате
    # TODO: при внедрении payments app заменить на OneToOneField('payments.Payment')
    amount_paid = models.DecimalField(
        'Сумма оплаты',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    payment_method = models.CharField(
        'Способ оплаты',
        max_length=50,
        blank=True,
        help_text='payme, click, test и т.д.'
    )
    payment_id = models.CharField(
        'ID транзакции',
        max_length=100,
        blank=True,
        help_text='ID транзакции от провайдера'
    )
    
    is_active = models.BooleanField('Активна', default=True)
    
    # Флаг, что вариант уже выбран (нельзя менять)
    variant_locked = models.BooleanField(
        'Вариант заблокирован',
        default=False,
        help_text='True после выбора варианта пользователем'
    )
    
    created_at = models.DateTimeField('Дата покупки', auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'enrollments'
        verbose_name = 'Покупка'
        verbose_name_plural = 'Покупки'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'course'],
                name='unique_enrollment_per_user_course'
            ),
        ]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['course']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.course}"
    
    def set_variant(self, variant):
        """Установить вариант тренировок (один раз)."""
        if self.variant_locked:
            raise ValidationError('Вариант уже выбран и не может быть изменён')
        if variant.course != self.course:
            raise ValidationError('Вариант не принадлежит этому курсу')
        self.variant = variant
        self.variant_locked = True
        self.save(update_fields=['variant', 'variant_locked', 'updated_at'])
    
    @property
    def progress_percent(self):
        """Вычисляет процент прохождения курса."""
        total = self.progress_items.count()
        if total == 0:
            return 0
        completed = self.progress_items.filter(is_completed=True).count()
        return round((completed / total) * 100)


class LessonProgress(models.Model):
    """Прогресс прохождения контента."""
    
    class ContentType(models.TextChoices):
        MODULE_CONTENT = 'module_content', 'Контент модуля'
        DAY_CONTENT = 'day_content', 'Контент дня'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='progress_items',
        verbose_name='Покупка'
    )
    
    # Generic reference к контенту
    content_id = models.UUIDField('ID контента')
    content_type = models.CharField(
        'Тип контента',
        max_length=30,
        choices=ContentType.choices
    )
    
    is_completed = models.BooleanField('Завершено', default=False)
    watch_percent = models.PositiveSmallIntegerField(
        'Процент просмотра',
        default=0,
        validators=[MaxValueValidator(100)],
        help_text='Для видео: процент просмотра'
    )
    completed_at = models.DateTimeField('Дата завершения', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'lesson_progress'
        verbose_name = 'Прогресс урока'
        verbose_name_plural = 'Прогресс уроков'
        constraints = [
            models.UniqueConstraint(
                fields=['enrollment', 'content_id', 'content_type'],
                name='unique_progress_per_content'
            ),
        ]
    
    def __str__(self):
        status = "✓" if self.is_completed else f"{self.watch_percent}%"
        return f"{self.enrollment} - {self.content_type}:{self.content_id} [{status}]"
    
    def mark_completed(self):
        """Отметить как завершённое."""
        from django.utils import timezone
        self.is_completed = True
        self.watch_percent = 100
        self.completed_at = timezone.now()
        self.save(update_fields=['is_completed', 'watch_percent', 'completed_at', 'updated_at'])