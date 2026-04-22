from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from courses.models import Course
from enrollments.models import Enrollment


@receiver(post_save, sender=Enrollment)
def increment_course_purchases(sender, instance, created, **kwargs):
    """Увеличить счётчик покупок курса при новой покупке."""
    if created:
        Course.objects.filter(pk=instance.course_id).update(
            purchases_count=models.F('purchases_count') + 1
        )


@receiver(post_delete, sender=Enrollment)
def decrement_course_purchases(sender, instance, **kwargs):
    """Уменьшить счётчик покупок курса при удалении."""
    Course.objects.filter(pk=instance.course_id).update(
        purchases_count=models.F('purchases_count') - 1
    )
