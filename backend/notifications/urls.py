from django.urls import path
from notifications.views import list_notifications, mark_all_read, mark_one_read

urlpatterns = [
    path('', list_notifications, name='notifications-list'),
    path('mark-all-read/', mark_all_read, name='notifications-mark-all-read'),
    path('<uuid:pk>/read/', mark_one_read, name='notifications-mark-one-read'),
]
