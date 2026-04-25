from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0005_category_description_uz_category_title_uz_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='revision_notes',
            field=models.TextField(blank=True, default='', verbose_name='Замечания администратора'),
        ),
        migrations.AlterField(
            model_name='course',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Черновик'),
                    ('pending_review', 'На проверке'),
                    ('revision_required', 'На доработке'),
                    ('published', 'Опубликован'),
                ],
                default='draft',
                max_length=20,
                verbose_name='Статус',
            ),
        ),
    ]
