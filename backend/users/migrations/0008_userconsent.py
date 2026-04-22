import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_trainer_instagram_intro_video'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserConsent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('consent_type', models.CharField(
                    choices=[
                        ('registration', 'Пользовательское соглашение + Политика конфиденциальности'),
                        ('privacy', 'Обработка персональных данных'),
                        ('marketing', 'Маркетинговые уведомления'),
                        ('medical', 'Медицинский дисклеймер'),
                        ('payment_rules', 'Правила оплаты и возврата'),
                    ],
                    max_length=20,
                    verbose_name='Тип согласия'
                )),
                ('document_version', models.CharField(default='1.0', max_length=20, verbose_name='Версия документа')),
                ('granted', models.BooleanField(default=True, verbose_name='Согласие дано')),
                ('granted_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата согласия')),
                ('revoked_at', models.DateTimeField(blank=True, null=True, verbose_name='Дата отзыва')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True, verbose_name='IP-адрес')),
                ('method', models.CharField(
                    choices=[
                        ('checkbox', 'Чекбокс'),
                        ('modal', 'Модальное окно'),
                        ('implicit', 'Конклюдентное действие'),
                    ],
                    default='checkbox',
                    max_length=20,
                    verbose_name='Способ получения'
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='consents',
                    to='users.user',
                    verbose_name='Пользователь'
                )),
            ],
            options={
                'verbose_name': 'Согласие пользователя',
                'verbose_name_plural': 'Согласия пользователей',
                'db_table': 'user_consents',
                'indexes': [
                    models.Index(fields=['user', 'consent_type'], name='user_consents_user_type_idx'),
                ],
            },
        ),
    ]
