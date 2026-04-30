from django.core.management.base import BaseCommand
from django.db.models import Count
from courses.models import Course
from enrollments.models import Enrollment


class Command(BaseCommand):
    help = 'Пересчитать purchases_count для всех курсов на основе реальных записей'

    def handle(self, *args, **options):
        counts = (
            Enrollment.objects
            .values('course_id')
            .annotate(total=Count('id'))
        )
        count_map = {row['course_id']: row['total'] for row in counts}

        updated = 0
        for course in Course.objects.only('id', 'purchases_count'):
            real_count = count_map.get(course.id, 0)
            if course.purchases_count != real_count:
                course.purchases_count = real_count
                course.save(update_fields=['purchases_count'])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f'Обновлено курсов: {updated}'))
