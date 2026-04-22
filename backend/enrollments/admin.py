from django.contrib import admin
from enrollments.models import Enrollment, LessonProgress


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'course', 'payment_method', 'amount_paid', 'is_active', 'created_at']
    list_filter = ['is_active', 'payment_method']
    search_fields = ['user__first_name', 'user__last_name', 'user__phone', 'course__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
    autocomplete_fields = ['user', 'course']

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj is None:
            # Дефолты для новой записи
            form.base_fields['payment_method'].initial = 'manual'
            form.base_fields['is_active'].initial = True
        return form


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'content_type', 'content_id', 'is_completed', 'watch_percent']
    list_filter = ['is_completed', 'content_type']
    readonly_fields = ['id', 'created_at', 'updated_at']
