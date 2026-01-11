from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from accounts.permissions import IsVerified
from photos.models import Photo
from .models import Comment
from .serializers import CommentSerializer
import logging
from notifications.utils import create_notification

logger = logging.getLogger(__name__)


class CommentView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, photo_id):
        comments = Comment.objects.filter(photo_id=photo_id).order_by("created_at")
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request, photo_id):
        try:
            photo = Photo.objects.get(photo_id=photo_id)
        except Photo.DoesNotExist:
            return Response({"error": "Photo not found"}, status=404)

        content = request.data.get("content", "").strip()
        if not content:
            return Response(
                {"error": "Comment cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        comment = Comment.objects.create(
            user=request.user,
            photo=photo,
            content=content
        )
        if photo.uploaded_by != request.user:
            try:
                    create_notification(
                        recipient=photo.uploaded_by,
                        actor=request.user,
                        message=f"{request.user.username} commented on your photo",
                        target=photo,
                    )
            except Exception as exc:
                    logger.exception("Failed to create notification for comment: %s", exc)


        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
