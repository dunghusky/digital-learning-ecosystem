from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny

from .models import CraftVillage
from .serializers import CraftVillageDetailSerializer, CraftVillageListSerializer


class CraftVillageViewSet(viewsets.ReadOnlyModelViewSet):
    """Public, read-only catalogue of published craft villages.

    Editing happens in the Django admin, so no write endpoints are exposed.
    """

    permission_classes = [AllowAny]
    lookup_field = "code"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["craft_type", "former_region", "recognition_status"]
    search_fields = ["name", "main_products", "commune", "former_commune", "short_description"]
    ordering_fields = ["name", "published_at"]

    def get_queryset(self):
        return CraftVillage.objects.published()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CraftVillageDetailSerializer
        return CraftVillageListSerializer
