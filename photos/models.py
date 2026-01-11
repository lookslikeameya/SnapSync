# photos/models.py

from django.db import models
from django.conf import settings
from albums.models import Album

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Photo(models.Model):
    photo_id = models.AutoField(primary_key=True)

    album = models.ForeignKey(Album, on_delete=models.CASCADE,null=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="uploaded_photos")
    is_processed = models.BooleanField(default=False)
    original_img = models.ImageField(upload_to="originals/")
    thumbnail_img = models.ImageField(upload_to="thumbnails/", null=True, blank=True)
    watermark_img = models.ImageField(upload_to="watermarks/", null=True, blank=True)

  
    tags = models.ManyToManyField(Tag, blank=True, related_name="photos")
    
    favorited_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="PhotoFavorite",
        related_name="favorite_photos",
        blank=True
    )
 
    users_tagged = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="tagged_photos"
    )

    capture_at = models.DateTimeField(null=True, blank=True)
    download_count = models.IntegerField(default=0)
    # metadata = models.JSONField(default=dict, blank=True)  will do json later
    metadata = models.CharField(null=True, blank=True)

class PhotoFavorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name="favorite_relations"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "photo")

    def __str__(self):
        return f"{self.user} favorited {self.photo.photo_id}"
