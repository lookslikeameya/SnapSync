from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Notification(models.Model):
    # who receives the notification
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    # who caused it (can be null: system notifications)
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="actions"
    )

    # what happened
    message = models.CharField(max_length=255)
    # examples:
    # "commented on your photo"
    # "tagged you"
    # "favorited your photo"

    # what object it refers to (photo_id, album_id etc.)
    target_type = models.CharField(max_length=50)
    target_id = models.PositiveIntegerField()

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient} - {self.message} - Read: {self.is_read}"