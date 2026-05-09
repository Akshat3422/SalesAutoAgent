import json
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@csrf_exempt
def login_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    user = authenticate(username=username, password=password)
    if user is not None:
        django_login(request, user)
        token, created = Token.objects.get_or_create(user=user)
        return JsonResponse({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name
            }
        })
    else:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    django_logout(request)
    # Optionally, delete the token to force re-login
    # request.user.auth_token.delete()
    return JsonResponse({"status": "success", "message": "Logged out"})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_view(request):
    user = request.user
    return JsonResponse({
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
    })
