from rest_framework import serializers
from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'body', 'is_read', 'related_url', 'created_at']
        read_only_fields = ['id', 'type', 'title', 'body', 'related_url', 'created_at']
