from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification



def create_notification(*, recipient, message, actor=None, target=None):
   
    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        message=message,
        target_type=target.__class__.__name__ if target else "",
        target_id=target.pk if target else None,
    )

    
    channel_layer = get_channel_layer()
    if channel_layer is None:
          return notification

    payload = {
        "type": "send_notification",
        "data": {
            "id": notification.id,
            "message": notification.message,
            "actor": actor.email if actor else None,
            "created_at": notification.created_at.isoformat(),
            "is_read": notification.is_read,
        },
    }

    group_name = f"notifications_{recipient.id}"

    
    async_to_sync(channel_layer.group_send)(group_name, payload)
       
   
    return notification