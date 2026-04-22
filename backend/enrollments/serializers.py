from rest_framework import serializers
from enrollments.models import Enrollment, LessonProgress
from training.models import TrainingVariant
from courses.models import ModuleContent
from training.models import DayContent


class UserEnrollmentCardSerializer(serializers.ModelSerializer):
    """Карточка записи для кабинета пользователя."""
    course_id = serializers.UUIDField(source='course.id', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_cover_url = serializers.URLField(source='course.cover_url', read_only=True)
    trainer_name = serializers.SerializerMethodField()
    total_lessons = serializers.SerializerMethodField()
    completed_lessons = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'course_id', 'course_title', 'course_cover_url',
            'trainer_name', 'total_lessons', 'completed_lessons',
            'progress_percent', 'amount_paid', 'payment_method', 'created_at',
        ]

    def get_trainer_name(self, obj):
        return obj.course.trainer.user.full_name or str(obj.course.trainer.user.phone)

    def get_total_lessons(self, obj):
        count = ModuleContent.objects.filter(module__course=obj.course).count()
        if obj.variant:
            count += DayContent.objects.filter(
                day__week__variant=obj.variant
            ).count()
        return count

    def get_completed_lessons(self, obj):
        return obj.progress_items.filter(is_completed=True).count()

    def get_progress_percent(self, obj):
        total = self.get_total_lessons(obj)
        if not total:
            return 0
        completed = self.get_completed_lessons(obj)
        return round((completed / total) * 100)


class EnrollmentSerializer(serializers.ModelSerializer):
    variant_name = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'course', 'variant', 'variant_name',
            'variant_locked', 'is_active', 'created_at',
        ]

    def get_variant_name(self, obj):
        if obj.variant:
            return obj.variant.name
        return None


class SetVariantSerializer(serializers.Serializer):
    variant_id = serializers.UUIDField()

    def validate_variant_id(self, value):
        try:
            variant = TrainingVariant.objects.get(pk=value)
        except TrainingVariant.DoesNotExist:
            raise serializers.ValidationError('Вариант не найден.')
        return value


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = [
            'id', 'content_id', 'content_type',
            'is_completed', 'watch_percent', 'completed_at',
        ]


class UpdateProgressSerializer(serializers.Serializer):
    content_id = serializers.UUIDField()
    content_type = serializers.ChoiceField(choices=LessonProgress.ContentType.choices)
    watch_percent = serializers.IntegerField(min_value=0, max_value=100)
