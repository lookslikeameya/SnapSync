from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsVerified(BasePermission):
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_verified)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.roles.filter(name="Admin").exists()


class IsPhotographer(BasePermission):
    def has_permission(self, request, view):
        return request.user.roles.filter(name="Photographer").exists()


class IsCoordinator(BasePermission):
    def has_permission(self, request, view):
        return request.user.roles.filter(name="Event Coordinator").exists()
    
class IsImgMember(BasePermission):
    def has_permission(self, request, view):
        return request.user.roles.filter(name="IMG Member").exists()
    
class IsNotGuest(BasePermission):
    def has_permission(self, request, view):
        return (request.user.roles.filter(name="IMG Member").exists() or
                request.user.roles.filter(name="Event Coordinator").exists() or
                request.user.roles.filter(name="Photographer").exists() or 
                request.user.roles.filter(name="Admin").exists()     
                )
class IsAdminOrCoordinator(BasePermission):
    def has_permission(self, request, view):
        return (
                request.user.roles.filter(name="Event Coordinator").exists() or
               
                request.user.roles.filter(name="Admin").exists()     
                )


class ReadOnlyForGuests(BasePermission):
    
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.roles.filter(name="Guest").exists() is False
