from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import CourseModule, ModuleContent
from training.models import DayContent


def update_module_is_filled(module):
    """Проверяет есть ли контент в модуле."""
    if module.type == CourseModule.ModuleType.TRAINING:
        # Для тренировок — проверяем DayContent через варианты
        has_content = DayContent.objects.filter(
            day__week__variant__course=module.course
        ).exists()
    else:
        # Для остальных — проверяем ModuleContent
        has_content = module.contents.exists()
    
    if module.is_filled != has_content:
        module.is_filled = has_content
        module.save(update_fields=['is_filled'])


# Сигналы для ModuleContent (theory, nutrition, recovery)
@receiver(post_save, sender=ModuleContent)
def module_content_saved(sender, instance, **kwargs):
    update_module_is_filled(instance.module)


@receiver(post_delete, sender=ModuleContent)
def module_content_deleted(sender, instance, **kwargs):
    update_module_is_filled(instance.module)


# Сигналы для DayContent (training)
@receiver(post_save, sender=DayContent)
def day_content_saved(sender, instance, **kwargs):
    course = instance.day.week.variant.course
    training_module = course.modules.filter(
        type=CourseModule.ModuleType.TRAINING
    ).first()
    if training_module:
        update_module_is_filled(training_module)


@receiver(post_delete, sender=DayContent)
def day_content_deleted(sender, instance, **kwargs):
    course = instance.day.week.variant.course
    training_module = course.modules.filter(
        type=CourseModule.ModuleType.TRAINING
    ).first()
    if training_module:
        update_module_is_filled(training_module)