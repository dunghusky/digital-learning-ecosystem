from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    LogoutSerializer,
    PasswordChangeSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


class AuthThrottleMixin:
    """Slows down password guessing and sign-up spam on the public auth endpoints."""

    throttle_scope = "auth"


class RegisterView(AuthThrottleMixin, generics.CreateAPIView):
    """Creates a student account. No tokens are returned: the student signs in afterwards
    with the username and password they just chose."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class LoginView(AuthThrottleMixin, TokenObtainPairView):
    pass


class RefreshView(AuthThrottleMixin, TokenRefreshView):
    pass


class LogoutView(APIView):
    """Blacklists the refresh token so it can no longer mint access tokens."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(request=LogoutSerializer, responses={205: None})
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            pass  # Already expired or blacklisted: the session is over either way.
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """The signed-in user's profile: GET to read, PATCH to change some fields."""

    http_method_names = ["get", "patch", "options"]

    def get_serializer_class(self):
        return UserSerializer if self.request.method == "GET" else ProfileUpdateSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(AuthThrottleMixin, APIView):
    """Changes the password after checking the current one. Existing tokens stay valid
    until they expire; the user is not signed out of this device."""

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
