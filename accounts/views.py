from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, VerifyOTPSerializer, LoginSerializer,GetRoleSerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import IsVerified,IsNotGuest
from django.contrib.auth import get_user_model


#get role
class GetRoleView(APIView):
    permission_classes=[IsAuthenticated]
    def get(self,request):
        serializer = GetRoleSerializer(request.user)
        return Response(serializer.data)
#get user list
User=get_user_model()
class UserListView(APIView):
    permission_classes=[IsAuthenticated,IsVerified,IsNotGuest]
    def get(self,request):
        users=User.objects.all().values("id","email")
        return Response(users)

#get event coordinators list
class EventCoordinatorsListView(APIView):
    permission_classes=[IsAuthenticated,IsVerified,IsNotGuest]
    def get(self,request):
        from .models import Role
        try:
            event_coordinator_role = Role.objects.get(name="Event Coordinator")
            users = User.objects.filter(roles=event_coordinator_role).values("id","email")
            return Response(users)
        except Role.DoesNotExist:
            return Response([])


class RegisterAPIView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered. OTP sent to email."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPAPIView(APIView):
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Account verified successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginAPIView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

    #Oauth stuff
    
from django.shortcuts import redirect
from django.conf import settings
import requests
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import JsonResponse

User = get_user_model()


# STEP 1: Redirect to Omniport
def omniport_login(request):
    print(settings.OMNIPORT_CLIENT_SECRET)
    url = (
        f"{settings.OMNIPORT_AUTHORIZE_URL}"
        f"?client_id={settings.OMNIPORT_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={settings.OMNIPORT_REDIRECT_URI}"
    )
    return redirect(url)


# STEP 2: Callback from Omniport
def omniport_callback(request):
    
    print("CLIENT_ID:", settings.OMNIPORT_CLIENT_ID)
    print("CLIENT_SECRET:", settings.OMNIPORT_CLIENT_SECRET)
    print("REDIRECT_URI:", settings.OMNIPORT_REDIRECT_URI)

    code = request.GET.get("code")

    token_res = requests.post(
        f"{settings.OMNIPORT_TOKEN_URL}",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": f"{settings.OMNIPORT_CLIENT_ID}" ,
            "client_secret": f"{settings.OMNIPORT_CLIENT_SECRET}",
            "redirect_uri": f"{settings.OMNIPORT_REDIRECT_URI}",
        },
        headers={"Accept": "application/json"}
    )

    print("STATUS:", token_res.status_code)
    print("TEXT:", token_res.text)

    token_data = token_res.json()
    access_token = token_data["access_token"]

    profile_res = requests.get(
         f"{settings.OMNIPORT_USERINFO_URL}",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    profile=profile_res.json()
    email = profile["contactInformation"]["instituteWebmailAddress"]
    username = profile["person"]["fullName"]

    # 3. Create or get user
    user, created = User.objects.get_or_create(
        email=email,
        is_verified = True,
        
        
        defaults={
            "username": username,
            
           
        },
    )
    from accounts.models import Role
    user.roles.set(Role.objects.filter(name="IMG Member"))
    

    # 4. Generate JWT
    refresh = RefreshToken.for_user(user)
    import urllib.parse

    params = urllib.parse.urlencode({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })

    frontend_url = "http://localhost:5173/omniport-success"
    return redirect(f"{frontend_url}?{params}")
    
