"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from albums.views import AlbumViewSet
from photos.views import PhotoViewSet, TagViewSet
from comments.views import CommentView
from notifications.views import NotificationViewSet 

router = DefaultRouter()
router.register("albums", AlbumViewSet)
router.register("photos", PhotoViewSet)
router.register("tags", TagViewSet)
router.register("notifications", NotificationViewSet, basename="notifications")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    # Nested comments API
    path(
        "api/photos/<int:photo_id>/comments/",
        CommentView.as_view(),
        name="photo-comments"
    ),
    path("api/accounts/", include("accounts.urls")),

]
from django.conf import settings
from django.conf.urls.static import static
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


