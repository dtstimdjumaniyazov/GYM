from rest_framework.permissions import BasePermission


class IsTrainer(BasePermission):
    """Разрешение только для пользователей с ролью тренера."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'trainer'
            and hasattr(request.user, 'trainer_profile')
        )

    def has_object_permission(self, request, view, obj):
        """Тренер может редактировать только свои курсы."""
        trainer = request.user.trainer_profile
        if hasattr(obj, 'trainer'):
            return obj.trainer == trainer
        if hasattr(obj, 'course'):
            return obj.course.trainer == trainer
        return False
