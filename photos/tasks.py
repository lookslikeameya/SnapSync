from celery import shared_task
from PIL import Image
from django.core.files.base import ContentFile
from io import BytesIO

from .models import Photo
from django.conf import settings
import os
@shared_task
def generate_thumbnail(photo_id):
    photo = Photo.objects.get(photo_id=photo_id)

    base_img = Image.open(photo.original_img)
    #if we have png or other img type

    if base_img.mode in ("RGBA", "P"):
        base_img = base_img.convert("RGB")


    # resize (keep aspect ratio)
    base_img.thumbnail((300, 300))

    watermark_path = os.path.join(
        settings.BASE_DIR,
        "backend",
        "assets",
        "watermark",
        "watermark.png"
    )

    watermark = Image.open(watermark_path).convert("RGBA")

    # Resize watermark (20% of image width)
    w_ratio = int(base_img.width * 0.2)
    w_height = int(watermark.height * (w_ratio / watermark.width))
    watermark = watermark.resize((w_ratio, w_height))

    # Position: bottom-right with padding
    padding = 20
    position = (
        base_img.width - watermark.width - padding,
        base_img.height - watermark.height - padding
    )

    base_img.paste(watermark, position, watermark)

    buffer = BytesIO()
    base_img.save(buffer, format="JPEG")
    buffer.seek(0)

    thumbnail_name = f"thumb_{photo.photo_id}.jpg"

    photo.thumbnail_img.save(
        thumbnail_name,
        ContentFile(buffer.read()),
        save=False
    )

    photo.is_processed = True
    photo.save()
    # return photo_id # for watermark to take input

#watermark_img generation


# @shared_task
# def generate_watermark(photo_id):
#     print("BASE_DIR =", settings.BASE_DIR)

#     photo = Photo.objects.get(photo_id=photo_id)

#     base_img = Image.open(photo.original_img)

#     if base_img.mode in ("RGBA", "P"):
#         base_img = base_img.convert("RGB")

#     watermark_path = os.path.join(
#         settings.BASE_DIR,
#         "backend",
#         "assets",
#         "watermark",
#         "watermark.png"
#     )

#     watermark = Image.open(watermark_path).convert("RGBA")

#     # Resize watermark (20% of image width)
#     w_ratio = int(base_img.width * 0.2)
#     w_height = int(watermark.height * (w_ratio / watermark.width))
#     watermark = watermark.resize((w_ratio, w_height))

#     # Position: bottom-right with padding
#     padding = 20
#     position = (
#         base_img.width - watermark.width - padding,
#         base_img.height - watermark.height - padding
#     )

#     base_img.paste(watermark, position, watermark)

#     buffer = BytesIO()
#     base_img.save(buffer, format="JPEG")
#     buffer.seek(0)

#     photo.watermark_img.save(
#         f"watermark_{photo.photo_id}.jpg",
#         ContentFile(buffer.read()),
#         save=False
#     )

#     photo.save()
