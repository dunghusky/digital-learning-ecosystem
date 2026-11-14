from rest_framework import serializers

from apps.archive.models import Document
from apps.archive.serializers import (
    GlossaryTermSerializer,
    ThemeSerializer,
    VillageRefSerializer,
)

from .models import Lesson, LessonDocument, LessonTask


class LessonListSerializer(serializers.ModelSerializer):
    objectives = serializers.ListField(
        source="objective_list", child=serializers.CharField(), read_only=True
    )
    task_count = serializers.IntegerField(read_only=True)
    document_count = serializers.IntegerField(read_only=True)
    villages = VillageRefSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "slug",
            "title",
            "subject",
            "grade",
            "objectives",
            "task_count",
            "document_count",
            "villages",
        ]


class LessonReadingSerializer(serializers.ModelSerializer):
    """The full text of a document, so students read it inside the lesson."""

    themes = ThemeSerializer(many=True, read_only=True)
    glossary = GlossaryTermSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            "slug",
            "title",
            "genre",
            "body",
            "answer",
            "glossary",
            "themes",
            "author",
            "collector",
            "source",
        ]


class LessonDocumentSerializer(serializers.ModelSerializer):
    document = LessonReadingSerializer(read_only=True)

    class Meta:
        model = LessonDocument
        fields = ["order", "note", "document"]


class LessonTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonTask
        fields = ["id", "order", "kind", "prompt", "hint"]


class LessonDetailSerializer(LessonListSerializer):
    author_name = serializers.SerializerMethodField()
    readings = LessonDocumentSerializer(source="lesson_documents", many=True, read_only=True)
    tasks = LessonTaskSerializer(many=True, read_only=True)

    class Meta(LessonListSerializer.Meta):
        fields = [
            *LessonListSerializer.Meta.fields,
            "introduction",
            "expected_output",
            "author_name",
            "readings",
            "tasks",
            "published_at",
            "updated_at",
        ]

    def get_author_name(self, lesson: Lesson) -> str:
        return lesson.author.display_name if lesson.author else ""
