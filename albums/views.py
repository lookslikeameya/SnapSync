from  rest_framework.viewsets import ModelViewSet

from rest_framework.permissions import IsAuthenticated

from .models import Album
from .serializers import AlbumSerializer,AlbumListSerializer
from accounts.permissions import IsVerified, IsCoordinator, IsAdmin, IsAdminOrCoordinator

# albums/views.py
class AlbumViewSet(ModelViewSet):
    queryset = Album.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "list":
            return AlbumListSerializer
        return AlbumSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsAdmin()]
        if self.action in ["update", "partial_update"]:
            return [IsAuthenticated(), IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        
        serializer.save(created_by=self.request.user)