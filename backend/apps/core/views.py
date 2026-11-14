from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@extend_schema(
    summary="Health check",
    responses=inline_serializer("HealthCheck", {"status": serializers.CharField()}),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request: Request) -> Response:
    return Response({"status": "ok"})
