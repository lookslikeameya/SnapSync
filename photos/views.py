from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Photo, Tag, PhotoFavorite
from .serializers import PhotoSerializer, PhotoListSerializer, TagSerializer

from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsVerified, IsPhotographer, IsAdmin, IsNotGuest
from django.http import FileResponse
from django.contrib.auth import get_user_model
import logging
from notifications.utils import create_notification

logger = logging.getLogger(__name__)

User = get_user_model()

# any serializer returning img or url requires request context..(for custom actions using their own serialiser)
# look at tagged ad favorites endpoints
class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer


# apply pagination
from rest_framework.pagination import PageNumberPagination


class PhotoPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 50


class PhotoViewSet(viewsets.ModelViewSet):
    queryset = Photo.objects.all().order_by("-photo_id")
    pagination_class = PhotoPagination

    # filtering queryset function..
    def filters(self, queryset):
        tag = self.request.query_params.get("tag")
        album = self.request.query_params.get("album")
        uploader = self.request.query_params.get("uploaded_by")
        tagged_user = self.request.query_params.get("tagged_user")

        if tag:
            queryset = queryset.filter(tags__name__iexact=tag)

        if album:
            queryset = queryset.filter(album__album_id=album)

        if uploader:
            queryset = queryset.filter(uploaded_by__email__iexact=uploader)

        if tagged_user:
            queryset = queryset.filter(users_tagged__email__iexact=tagged_user)

        return queryset.distinct()

    def get_queryset(self):
        qs = Photo.objects.all().order_by("-photo_id")
        return self.filters(qs)

    permission_classes = [IsAuthenticated, IsVerified]

    def get_serializer_class(self):
        if self.request.method == "GET" and self.kwargs.get("pk") is None:
            return PhotoListSerializer
        return PhotoSerializer

    # def perform_create(self, serializer):
    #     photo= serializer.save(uploaded_by=self.request.user)
    #     #generate thumbnail and watermark (by chaining)
    #     from photos.tasks import generate_thumbnail, generate_watermark
    #     from celery import chain
    #     chain(
    #         generate_thumbnail.s(photo.photo_id),
    #         generate_watermark.s()
    #     ).delay()

    # batch upload endpoint
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsVerified, IsNotGuest],
    )
    def batch_upload(self, request):
        files = request.FILES.getlist("photos")
        album_id = request.data.get("album")

        if not files:
            return Response(
                {"error": "No files provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        album = None
        if album_id:
            from albums.models import Album

            try:
                album = Album.objects.get(album_id=album_id)
            except Album.DoesNotExist:
                return Response(
                    {"error": "Invalid album"}, status=status.HTTP_400_BAD_REQUEST
                )

        created_photos = []

        from photos.tasks import generate_thumbnail, auto_tag_photo
        from celery import chain

        for file in files:
            photo = Photo.objects.create(
                original_img=file, uploaded_by=request.user, album=album
            )

            # async processing per photo
            chain(generate_thumbnail.s(photo.photo_id), auto_tag_photo.s()).delay()

            created_photos.append(photo.photo_id)

        return Response(
            {
                "message": "Batch upload started",
                "count": len(created_photos),
                "photo_ids": created_photos,
            },
            status=status.HTTP_201_CREATED,
        )

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [IsAuthenticated(), IsAdmin()]

        # # PHOTOGRAPHER-ONLY UPLOAD
        # if self.request.method == "POST":
        #     return [IsAuthenticated(), IsVerified(), IsPhotographer()]

        return super().get_permissions()

    # Add tag
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsVerified, IsNotGuest],
    )
    def add_tag(self, request, pk=None):
        photo = self.get_object()
        tag_name = request.data.get("tag")
        # checks if tag already exists and then creates
        tag, _ = Tag.objects.get_or_create(name=tag_name)
        photo.tags.add(tag)

        return Response({"message": "Tag added"})

    # Remove tag
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsVerified, IsNotGuest],
    )
    def remove_tag(self, request, pk=None):
        photo = self.get_object()
        tag_name = request.data.get("tag")

        try:
            tag = Tag.objects.get(name=tag_name)
            photo.tags.remove(tag)
        except Tag.DoesNotExist:
            return Response({"error": "Tag not found"}, status=400)

        return Response({"message": "Tag removed"})

    @action(
        detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def favorite(self, request, pk=None):
        photo = self.get_object()

        _, created = PhotoFavorite.objects.get_or_create(user=request.user, photo=photo)

        if created and photo.uploaded_by != request.user:
            try:
                create_notification(
                    recipient=photo.uploaded_by,
                    actor=request.user,
                    message=f"{request.user.username} liked your photo",
                    target=photo,
                )
            except Exception as exc:
                logger.exception("Failed to create notification for favorite: %s", exc)

        return Response(
            {"message": "Photo added to favorites"}, status=status.HTTP_200_OK
        )

    @action(
        detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def unfavorite(self, request, pk=None):
        photo = self.get_object()

        PhotoFavorite.objects.get(user=request.user, photo=photo).delete()

        return Response(
            {"message": "Photo removed to favorites"}, status=status.HTTP_200_OK
        )

    # to get the favourite photos of a user
    @action(
        detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def favorites(self, request):
        # using the related anmes in favorited by filed of photo model
        photos = request.user.favorite_photos.all().order_by("-photo_id")
        photos = self.filters(photos)
        page = self.paginate_queryset(photos)
        if page is not None:
            serializer = PhotoListSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = PhotoListSerializer(photos, many=True)
        return Response(serializer.data)

    # Download endpoint
    @action(
        detail=True,
        methods=["get"],
        permission_classes=[IsAuthenticated, IsVerified, IsNotGuest],
    )
    def download(self, request, pk=None):
        photo = self.get_object()

        # permission already passed → serve original
        if photo.original_img:
            # increment download count
            try:
                photo.download_count = (photo.download_count or 0) + 1
                photo.save(update_fields=["download_count"])
            except Exception:
                # non-fatal if increment fails
                pass

            return FileResponse(
                photo.original_img.open("rb"),
                as_attachment=True,
                filename=f"photo_{photo.photo_id}_original.jpg",
            )

        return Response(
            {"error": "Original image not available"}, status=status.HTTP_404_NOT_FOUND
        )

    # endpoint to get photos where the user is tagged in
    @action(
        detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def tagged(self, request):
        photos = request.user.tagged_photos.all().order_by("-photo_id")
        photos = self.filters(photos)

        page = self.paginate_queryset(photos)
        if page is not None:
            serializer = PhotoListSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = PhotoListSerializer(photos, many=True)
        return Response(serializer.data)

    # photographer: list my uploads
    @action(
        detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def my_uploads(self, request):
        photos = Photo.objects.filter(uploaded_by=request.user).order_by("-photo_id")
        photos = self.filters(photos)

        page = self.paginate_queryset(photos)
        if page is not None:
            serializer = PhotoListSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = PhotoListSerializer(photos, many=True, context={"request": request})
        return Response(serializer.data)

    # photographer stats
    @action(
        detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def my_stats(self, request):
        from django.db.models import Sum, Count

        total_uploads = Photo.objects.filter(uploaded_by=request.user).count()
        total_downloads = (
            Photo.objects.filter(uploaded_by=request.user).aggregate(total=Sum("download_count"))[
                "total"
            ] or 0
        )
        total_favorites = PhotoFavorite.objects.filter(photo__uploaded_by=request.user).count()

        return Response(
            {
                "total_uploads": total_uploads,
                "total_downloads": total_downloads,
                "total_favorites": total_favorites,
            }
        )

    # add tagged user
    @action(
        detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def add_user_tag(self, request, pk=None):
        photo = self.get_object()
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"error": "user_id required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
            photo.users_tagged.add(user)
            # if user != request.user:
            try:
                    create_notification(
                        recipient=user,
                        actor=request.user,
                        message=f"{request.user.username} tagged you in a photo",
                        target=photo,
                    )
            except Exception as exc:
                    logger.exception("Failed to create notification for tag: %s", exc)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response({"message": "User tagged successfully"})

    # remove tagged user
    @action(
        detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsVerified]
    )
    def remove_user_tag(self, request, pk=None):
        photo = self.get_object()
        user_id = request.data.get("user_id")

        try:
            user = User.objects.get(id=user_id)
            photo.users_tagged.remove(user)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response({"message": "User untagged successfully"})
