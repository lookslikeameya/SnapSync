from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from channels.db import database_sync_to_async


@database_sync_to_async
def get_user_from_jwt(token):
    """Validate JWT token and return user"""
    jwt_auth = JWTAuthentication()
    try:
        
        
        # Get validated token
        validated_token = jwt_auth.get_validated_token(token)
       
        user = jwt_auth.get_user(validated_token)

        print(f"✅ User authenticated: {user.email}")
        
        return user
    except Exception as e:
       
        print(f"❌ JWT validation failed: {e}")
        return AnonymousUser()

class JWTAuthMiddleware:
    """
    WebSocket middleware that extracts JWT token from query string
    and authenticates the connection
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Default to anonymous
        scope["user"] = AnonymousUser()

        # Extract token from query string
        query_string = scope.get("query_string", b"").decode()
        
        print(f"🔄 WebSocket handshake - Query: {query_string[:100]}...")
        
        if "token=" in query_string:
            try:
                # Parse token from query string
                token = query_string.split("token=")[1]
                
                print(f"🔄 Found token={token}")
                
                # Authenticate user
                user = await get_user_from_jwt(token)
                scope["user"] = user
            except Exception as e:
                
                print(f"❌ Failed to extract token: {e}")
        else:
            
            print(f"⚠️ No token found in query string")

        return await self.inner(scope, receive, send)
