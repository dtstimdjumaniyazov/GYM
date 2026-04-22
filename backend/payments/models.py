import uuid
from django.db import models
from users.models import User
from courses.models import Course


class PaymeTransaction(models.Model):
    """Транзакция платёжной системы Payme (Paycom)."""

    # Payme states: 1=создана, 2=выполнена, -1=отменена, -2=отменена после выполнения
    STATE_CREATED = 1
    STATE_COMPLETED = 2
    STATE_CANCELLED = -1
    STATE_CANCELLED_AFTER_COMPLETE = -2

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payme_transactions',
        verbose_name='Пользователь',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name='payme_transactions',
        verbose_name='Курс',
    )
    amount = models.BigIntegerField('Сумма (тийин)')  # 1 UZS = 100 тийин
    payme_trans_id = models.CharField(
        'Payme Trans ID',
        max_length=255,
        null=True,
        blank=True,
        unique=True,
    )
    state = models.IntegerField('Состояние Payme', null=True, blank=True)
    cancel_reason = models.IntegerField('Причина отмены', null=True, blank=True)
    create_time = models.BigIntegerField('Время создания (ms)', null=True, blank=True)
    perform_time = models.BigIntegerField('Время выполнения (ms)', null=True, blank=True)
    cancel_time = models.BigIntegerField('Время отмены (ms)', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payme_transactions'
        verbose_name = 'Payme транзакция'
        verbose_name_plural = 'Payme транзакции'
        indexes = [
            models.Index(fields=['user', 'course']),
            models.Index(fields=['payme_trans_id']),
            models.Index(fields=['state']),
        ]

    def __str__(self):
        return f"{self.user} — {self.course} [state={self.state}]"


class ClickTransaction(models.Model):
    """Транзакция платёжной системы Click UZ."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидание'
        PREPARED = 'prepared', 'Подготовлено'
        COMPLETED = 'completed', 'Завершено'
        CANCELLED = 'cancelled', 'Отменено'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='click_transactions',
        verbose_name='Пользователь',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name='click_transactions',
        verbose_name='Курс',
    )
    amount = models.DecimalField(
        'Сумма',
        max_digits=12,
        decimal_places=2,
    )
    # Click's own transaction ID — заполняется при первом callback-е
    click_trans_id = models.CharField(
        'Click Trans ID',
        max_length=100,
        null=True,
        blank=True,
    )
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'click_transactions'
        verbose_name = 'Click транзакция'
        verbose_name_plural = 'Click транзакции'
        indexes = [
            models.Index(fields=['user', 'course']),
            models.Index(fields=['click_trans_id']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.user} — {self.course} [{self.status}]"
