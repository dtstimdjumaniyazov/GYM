import uuid
from django.db import models
from users.models import User


class Notification(models.Model):
    class Type(models.TextChoices):
        COURSE_SUBMITTED = 'course_submitted', 'Курс отправлен на проверку'
        COURSE_PUBLISHED = 'course_published', 'Курс опубликован'
        COURSE_REVISION = 'course_revision', 'Курс отправлен на доработку'
        TRAINER_VERIFIED = 'trainer_verified', 'Тренер верифицирован'
        VERIFICATION_REQUESTED = 'verification_requested', 'Запрос на верификацию'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField('Тип', max_length=30, choices=Type.choices)
    title = models.CharField('Заголовок', max_length=200)
    body = models.TextField('Текст', blank=True)
    is_read = models.BooleanField('Прочитано', default=False)
    related_url = models.CharField('Ссылка', max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} — {self.title}'
