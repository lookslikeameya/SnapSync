from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Album

User = get_user_model()

class AlbumSerializer(serializers.ModelSerializer):
    coordinators = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = Album
        fields = "__all__"
        read_only_fields = ["created_by", "created_at"]

class AlbumListSerializer(serializers.ModelSerializer):
    cover_image = serializers.ImageField(read_only=True)

    class Meta:
        model = Album
        fields = [
            "album_id",
            "title",
            "cover_image",
            "start_date",
            "end_date",
            "description",
            "coordinators",
        ]