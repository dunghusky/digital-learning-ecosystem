from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.filters import AccentInsensitiveSearchFilter

from .models import CraftVillage
from .serializers import (
    CraftVillageDetailSerializer,
    CraftVillageFeatureSerializer,
    CraftVillageListSerializer,
)


class CraftVillageViewSet(viewsets.ReadOnlyModelViewSet):
    """Public, read-only catalogue of published craft villages.

    Editing happens in the Django admin, so no write endpoints are exposed.
    """

    permission_classes = [AllowAny]
    lookup_field = "code"
    filter_backends = [
        DjangoFilterBackend,
        AccentInsensitiveSearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["craft_type", "former_region", "recognition_status"]
    search_fields = ["name", "main_products", "commune", "former_commune", "short_description"]
    ordering_fields = ["name", "published_at"]

    def get_queryset(self):
        return CraftVillage.objects.published()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CraftVillageDetailSerializer
        return CraftVillageListSerializer

    @extend_schema(
        summary="Villages as a GeoJSON FeatureCollection",
        description=(
            "Every published village in one unpaginated response, for the map. Villages "
            "without coordinates have `geometry: null`. Accepts the same filters as the list."
        ),
        responses=OpenApiTypes.OBJECT,
    )
    @action(detail=False, url_path="map", url_name="map", pagination_class=None)
    def map_features(self, request: Request) -> Response:
        villages = self.filter_queryset(self.get_queryset())
        features = CraftVillageFeatureSerializer(villages, many=True).data
        return Response({"type": "FeatureCollection", "features": features})
