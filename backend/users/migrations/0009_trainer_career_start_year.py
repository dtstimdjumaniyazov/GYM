from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_userconsent'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainer',
            name='career_start_year',
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                verbose_name='Год начала карьеры',
                help_text='Год, с которого тренер ведёт тренерскую деятельность',
            ),
        ),
    ]
