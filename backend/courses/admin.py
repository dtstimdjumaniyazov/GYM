from django.contrib import admin
from django.utils import timezone
from courses.models import Category, Course, CourseModule, ModuleContent, Favorite


admin.site.register(Category)
admin.site.register(CourseModule)
admin.site.register(ModuleContent)
admin.site.register(Favorite)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'get_trainer_name', 'category', 'status',
        'deletion_requested', 'deletion_confirmed_at', 'get_transition_ends_at',
        'purchases_count', 'price', 'created_at',
    )
    list_filter = ('status', 'deletion_requested', 'category')
    search_fields = ('title', 'trainer__user__first_name', 'trainer__user__last_name')
    actions = ['approve_deletion', 'reject_deletion', 'publish_courses', 'unpublish_courses']

    def get_trainer_name(self, obj):
        return obj.trainer.user.full_name or str(obj.trainer.user.phone)
    get_trainer_name.short_description = 'Тренер'

    def get_transition_ends_at(self, obj):
        if obj.deletion_confirmed_at:
            ends_at = obj.deletion_confirmed_at + timezone.timedelta(days=90)
            remaining = ends_at - timezone.now()
            days_left = remaining.days
            if days_left < 0:
                return f'Истёк ({ends_at.strftime("%d.%m.%Y")})'
            return f'{days_left} дн. (до {ends_at.strftime("%d.%m.%Y")})'
        return '—'
    get_transition_ends_at.short_description = 'Удаление через'

    @admin.action(description='Подтвердить удаление (запустить 90-дневный период)')
    def approve_deletion(self, request, queryset):
        qs = queryset.filter(deletion_requested=True, deletion_confirmed_at__isnull=True)
        count = qs.update(
            status=Course.Status.DRAFT,
            deletion_confirmed_at=timezone.now(),
        )
        self.message_user(
            request,
            f'Запущен 90-дневный переходный период для {count} курс(ов). '
            f'Курсы сняты с публикации, контент будет удалён через 90 дней командой cleanup_expired_courses.'
        )

    @admin.action(description='Отклонить запрос на удаление')
    def reject_deletion(self, request, queryset):
        updated = queryset.filter(deletion_requested=True).update(
            deletion_requested=False,
            deletion_confirmed_at=None,
        )
        self.message_user(request, f'Запрос на удаление отклонён у {updated} курс(ов).')

    @admin.action(description='Опубликовать выбранные курсы')
    def publish_courses(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(request, f'{updated} курс(ов) опубликовано.')

    @admin.action(description='Снять с публикации')
    def unpublish_courses(self, request, queryset):
        updated = queryset.update(status='draft')
        self.message_user(request, f'{updated} курс(ов) снято с публикации.')
