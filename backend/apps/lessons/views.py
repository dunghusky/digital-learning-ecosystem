from django.db.models import Count, Prefetch, Q, QuerySet
from django_filters import rest_framework as django_filters
from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny

from apps.archive.models import Document
from apps.core.filters import AccentInsensitiveSearchFilter
from apps.core.models import PublicationStatus
from apps.villages.models import CraftVillage

from .models import Lesson, LessonDocument, Subject
from .serializers import LessonDetailSerializer, LessonListSerializer


class LessonFilter(django_filters.FilterSet):
    subject = django_filters.ChoiceFilter(choices=Subject.choices)
    grade = django_filters.NumberFilter()
    village = django_filters.CharFilter(field_name="villages__code", label="Village code")
    document = django_filters.CharFilter(field_name="documents__slug", label="Document slug")

    class Meta:
        model = Lesson
        fields = ["subject", "grade", "village", "document"]


def published_lessons() -> QuerySet[Lesson]:
    """Published lessons with counts and links that only point at published content:
    a draft document or village must never show up inside a public lesson."""
    published_documents = Q(lesson_documents__document__status=PublicationStatus.PUBLISHED)
    return (
        Lesson.objects.published()
        .annotate(
            task_count=Count("tasks", distinct=True),
            document_count=Count("lesson_documents", filter=published_documents, distinct=True),
        )
        .prefetch_related(Prefetch("villages", queryset=CraftVillage.objects.published()))
        # Aggregating queries drop Meta.ordering, and pagination needs a stable order.
        .order_by("grade", "title", "pk")
    )


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """Public, read-only lessons. Teachers write them in the Django admin."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [
        django_filters.DjangoFilterBackend,
        AccentInsensitiveSearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = LessonFilter
    search_fields = ["title", "objectives", "introduction", "villages__name"]
    ordering_fields = ["grade", "title", "published_at"]

    def get_queryset(self) -> QuerySet[Lesson]:
        queryset = published_lessons()
        if self.action == "retrieve":
            readings = LessonDocument.objects.filter(
                document__in=Document.objects.published()
            ).select_related("document")
            queryset = queryset.select_related("author").prefetch_related(
                Prefetch("lesson_documents", queryset=readings),
                "lesson_documents__document__glossary",
                "lesson_documents__document__themes",
                "tasks",
            )
        return queryset

    def filter_queryset(self, queryset: QuerySet[Lesson]) -> QuerySet[Lesson]:
        # Filtering across the many-to-many links can repeat a lesson.
        return super().filter_queryset(queryset).distinct()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return LessonDetailSerializer
        return LessonListSerializer
