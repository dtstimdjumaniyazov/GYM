from django.contrib import admin
from users.models import User, Trainer


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['phone', 'first_name', 'last_name', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active']
    search_fields = ['phone', 'first_name', 'last_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_login']


@admin.register(Trainer)
class TrainerAdmin(admin.ModelAdmin):
    list_display = ('get_user_name', 'specialization', 'experience_years', 'is_verified', 'created_at')
    list_filter = ('is_verified',)
    search_fields = ('user__first_name', 'user__last_name', 'user__phone', 'specialization')
    actions = ['verify_trainers', 'unverify_trainers']

    def get_user_name(self, obj):
        return obj.user.full_name or str(obj.user.phone)
    get_user_name.short_description = 'Тренер'

    @admin.action(description='Верифицировать выбранных тренеров')
    def verify_trainers(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} тренер(ов) верифицировано.')

    @admin.action(description='Снять верификацию')
    def unverify_trainers(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f'Верификация снята у {updated} тренер(ов).')
