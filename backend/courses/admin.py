from django import forms
from django.contrib import admin
from django.shortcuts import render
from django.utils import timezone
from courses.models import Category, Course, CourseModule, ModuleContent, Favorite


class RevisionNotesForm(forms.Form):
    revision_notes = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 5, 'style': 'width:100%'}),
        label='Замечания (будут видны тренеру)',
        required=True,
    )


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
    readonly_fields = ('revision_notes',)
    actions = ['approve_deletion', 'reject_deletion', 'publish_courses', 'unpublish_courses', 'send_for_revision']

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

    @admin.action(description='Одобрить и опубликовать курсы')
    def publish_courses(self, request, queryset):
        now = timezone.now()
        updated = queryset.filter(status='pending_review').update(
            status='published',
            published_at=now,
        )
        self.message_user(request, f'{updated} курс(ов) одобрено и опубликовано.')

    @admin.action(description='Снять с публикации')
    def unpublish_courses(self, request, queryset):
        updated = queryset.update(status='draft')
        self.message_user(request, f'{updated} курс(ов) снято с публикации.')

    @admin.action(description='Отправить на доработку (с замечаниями)')
    def send_for_revision(self, request, queryset):
        if 'apply' in request.POST:
            form = RevisionNotesForm(request.POST)
            if form.is_valid():
                notes = form.cleaned_data['revision_notes']
                ids = list(queryset.values_list('id', flat=True))
                updated = Course.objects.filter(
                    id__in=ids,
                    status__in=['pending_review', 'published'],
                ).update(status='revision_required', revision_notes=notes)
                self.message_user(request, f'{updated} курс(ов) отправлено на доработку.')
                return None
        else:
            form = RevisionNotesForm()

        return render(request, 'admin/courses/send_for_revision.html', {
            'form': form,
            'queryset': queryset,
            'action_checkbox_name': admin.helpers.ACTION_CHECKBOX_NAME,
            'opts': self.model._meta,
            'title': 'Отправить курсы на доработку',
        })
