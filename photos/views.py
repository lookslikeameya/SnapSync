from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Photo, Tag, PhotoFavorite
from .serializers import PhotoSerializer,PhotoListSerializer, TagSerializer

from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsVerified, IsPhotographer,IsAdmin

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

#apply pagination
from rest_framework.pagination import PageNumberPagination
class PhotoPagination(PageNumberPagination):
    page_size=12
    page_size_query_param="page_size"
    max_page_size=50



class PhotoViewSet(viewsets.ModelViewSet):
    pagination_class = PhotoPagination
    queryset = Photo.objects.all().order_by("-photo_id")
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
    permission_classes=[IsAuthenticated, IsVerified, IsPhotographer]
    )

    def batch_upload(self, request):
        files = request.FILES.getlist("photos")
        album_id = request.data.get("album")


        if not files:
            return Response(
                {"error": "No files provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        album = None
        if album_id:
            from albums.models import Album
            try:
             album = Album.objects.get(album_id=album_id)
            except Album.DoesNotExist:
                return Response(
                 {"error": "Invalid album"},
                 status=status.HTTP_400_BAD_REQUEST
                )


        created_photos = []

        from photos.tasks import generate_thumbnail, generate_watermark
        from celery import chain

        for file in files:
            photo = Photo.objects.create(
                original_img=file,
                uploaded_by=request.user,
                album=album
            )

            # async processing per photo
            chain(
                generate_thumbnail.s(photo.photo_id),
                generate_watermark.s()
            ).delay()

            created_photos.append(photo.photo_id)

        return Response(
            {
             "message": "Batch upload started",
             "count": len(created_photos),
             "photo_ids": created_photos
            },
            status=status.HTTP_201_CREATED
        )
    



    def get_permissions(self):
        if self.request.method == "DELETE":
            return [IsAuthenticated(), IsAdmin()]

        # PHOTOGRAPHER-ONLY UPLOAD
        if self.request.method == "POST":
            return [IsAuthenticated(), IsVerified(), IsPhotographer()]

        return super().get_permissions()    

    #Add tag
    @action(detail=True, methods=["post"])
    def add_tag(self, request, pk=None):
        photo = self.get_object()
        tag_name = request.data.get("tag")
        #checks if tag already exists and then creates
        tag, _ = Tag.objects.get_or_create(name=tag_name)
        photo.tags.add(tag)

        return Response({"message": "Tag added"})

    #Remove tag
    @action(detail=True, methods=["post"])
    def remove_tag(self, request, pk=None):
        photo = self.get_object()
        tag_name = request.data.get("tag")

        try:
            tag = Tag.objects.get(name=tag_name)
            photo.tags.remove(tag)
        except Tag.DoesNotExist:
            return Response({"error": "Tag not found"}, status=400)

        return Response({"message": "Tag removed"})
    

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def favorite(self, request, pk=None):
        photo = self.get_object()

        PhotoFavorite.objects.get_or_create(
        user=request.user,
        photo=photo
        )

        return Response(
        {"message": "Photo added to favorites"},
        status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def unfavorite(self, request, pk=None):
        photo = self.get_object()

        PhotoFavorite.objects.get(
        user=request.user,
        photo=photo
        ).delete()

        return Response(
        {"message": "Photo removed to favorites"},
        status=status.HTTP_200_OK
        )
    
#to get the favourite photos of a user
    @action(
    detail=False,
    methods=["get"],
    permission_classes=[IsAuthenticated,IsVerified]
    )
    def favorites(self, request):
        #using the related anmes in favorited by filed of photo model
        photos = request.user.favorite_photos.all().order_by("-photo_id")
        page = self.paginate_queryset(photos)
        if page is not None:
            serializer = PhotoListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PhotoListSerializer(photos, many=True)
        return Response(serializer.data)


    

    
   