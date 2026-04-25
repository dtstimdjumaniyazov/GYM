import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('type', models.CharField(
                    choices=[
                        ('course_submitted', 'Курс отправлен на проверку'),
                        ('course_published', 'Курс опубликован'),
                        ('course_revision', 'Курс отправлен на доработку'),
                        ('trainer_verified', 'Тренер верифицирован'),
                        ('verification_requested', 'Запрос на верификацию'),
                    ],
                    max_length=30,
                    verbose_name='Тип',
                )),
                ('title', models.CharField(max_length=200, verbose_name='Заголовок')),
                ('body', models.TextField(blank=True, verbose_name='Текст')),
                ('is_read', models.BooleanField(default=False, verbose_name='Прочитано')),
                ('related_url', models.CharField(blank=True, max_length=500, verbose_name='Ссылка')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Уведомление',
                'verbose_name_plural': 'Уведомления',
                'db_table': 'notifications',
                'ordering': ['-created_at'],
            },
        ),
    ]
