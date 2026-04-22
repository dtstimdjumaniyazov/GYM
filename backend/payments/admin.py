from django.contrib import admin
from payments.models import ClickTransaction, PaymeTransaction


@admin.register(ClickTransaction)
class ClickTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'course', 'amount', 'status', 'click_trans_id', 'created_at']
    list_filter = ['status']
    search_fields = ['user__first_name', 'user__last_name', 'course__title', 'click_trans_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(PaymeTransaction)
class PaymeTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'course', 'amount_uzs', 'state', 'payme_trans_id', 'created_at']
    list_filter = ['state']
    search_fields = ['user__first_name', 'user__last_name', 'course__title', 'payme_trans_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']

    @admin.display(description='Сумма (UZS)')
    def amount_uzs(self, obj):
        return f"{obj.amount / 100:,.0f}"
