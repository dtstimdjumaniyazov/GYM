from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0003_course_deletion_requested_alter_course_cover_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='deletion_confirmed_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Дата подтверждения удаления администратором. Курс удаляется через 90 дней.',
                null=True,
                verbose_name='Начало переходного периода'
            ),
        ),
    ]
