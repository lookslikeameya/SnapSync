from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "actor_email",
            "message",
            "target_type",
            "target_id",
            "is_read",
            "created_at",
        ]

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor else None