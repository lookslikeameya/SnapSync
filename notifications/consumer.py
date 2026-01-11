import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer




class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        
        print(f"🔄 WS Connection attempt - User: {user}")

        if user.is_anonymous:
            print("❌ WebSocket connection rejected - Anonymous user")
            await self.close()
            return

        self.user = user
        self.group_name = f"notifications_{self.user.id}"

        print(f"✅ User {self.user.id} joining group {self.group_name}")

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        print(f"✅ WS CONNECTED: {user.email}")

    async def disconnect(self, close_code):
        if hasattr(self, 'user'):
            print(f"🔕 User {self.user.id} disconnected (code: {close_code})")
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def send_notification(self, event):
        print(f"📤 Sending notification to {self.user.id}")
        await self.send(text_data=json.dumps(event["data"]))