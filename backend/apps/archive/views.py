from django.db.models import Count, Prefetch, Q, QuerySet
from django.utils import timezone
from django_filters import rest_framework as django_filters
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.filters import AccentInsensitiveSearchFilter
from apps.villages.models import CraftVillage

from .models import Document, Genre
from .serializers import DocumentDetailSerializer, DocumentListSerializer, GenreCountSerializer

RELATED_LIMIT = 4


def with_links(queryset: QuerySet[Document]) -> QuerySet[Document]:
    """Prefetch themes and only the *published* villages: a draft village must not leak
    through a document, and linking to it would lead to a 404."""
    return queryset.prefetch_related(
        Prefetch("villages", queryset=CraftVillage.objects.published()), "themes"
    )


class DocumentFilter(django_filters.FilterSet):
    village = django_filters.CharFilter(field_name="villages__code", label="Village code")
    theme = django_filters.CharFilter(field_name="themes__slug", label="Theme slug")

    class Meta:
        model = Document
        fields = ["genre", "grade_level", "village", "theme"]


def related_documents(document: Document) -> QuerySet[Document]:
    """Published documents sharing a village or theme, most shared links first."""
    village_ids = list(document.villages.values_list("pk", flat=True))
    theme_ids = list(document.themes.values_list("pk", flat=True))
    shared = Q(villages__in=village_ids) | Q(themes__in=theme_ids)
    related = (
        Document.objects.published()
        .exclude(pk=document.pk)
        .filter(shared)
        .annotate(shared_links=Count("pk", filter=shared))
        .order_by("-shared_links", "title")
    )
    return with_links(related)[:RELATED_LIMIT]


class DocumentViewSet(viewsets.ReadOnlyModelViewSet):
    """Public, read-only digital archive. Editing happens in the Django admin."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [
        django_filters.DjangoFilterBackend,
        AccentInsensitiveSearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DocumentFilter
    search_fields = ["title", "body", "summary", "villages__name", "themes__name"]
    ordering_fields = ["title", "published_at"]

    def get_queryset(self) -> QuerySet[Document]:
        queryset = with_links(Document.objects.published())
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("glossary")
        return queryset

    def filter_queryset(self, queryset: QuerySet[Document]) -> QuerySet[Document]:
        # Filtering or searching across the many-to-many links can repeat a document.
        return super().filter_queryset(queryset).distinct()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentDetailSerializer
        return DocumentListSerializer

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        document = self.get_object()
        context = self.get_serializer_context() | {"related": related_documents(document)}
        return Response(DocumentDetailSerializer(document, context=context).data)

    @extend_schema(
        summary="Document of the day",
        description=(
            "One published document that changes every day, e.g. for a folk verse of the day "
            "on the home page. Everyone gets the same document on the same day."
        ),
        parameters=[OpenApiParameter("genre", enum=Genre.values, required=False)],
        responses=DocumentDetailSerializer,
    )
    @action(detail=False, pagination_class=None)
    def featured(self, request: Request) -> Response:
        candidates = self.get_queryset().order_by("pk")
        if genre := request.query_params.get("genre"):
            candidates = candidates.filter(genre=genre)
        count = candidates.count()
        if not count:
            return Response({"detail": "No published document."}, status=404)
        document = candidates[timezone.localdate().toordinal() % count]
        context = self.get_serializer_context() | {"related": related_documents(document)}
        return Response(DocumentDetailSerializer(document, context=context).data)

    @extend_schema(
        summary="Number of published documents per genre",
        responses=GenreCountSerializer(many=True),
    )
    @action(detail=False, pagination_class=None)
    def genres(self, request: Request) -> Response:
        counts = (
            Document.objects.published()
            .values("genre")
            .annotate(count=Count("pk"))
            .order_by("-count", "genre")
        )
        return Response(GenreCountSerializer(counts, many=True).data)
