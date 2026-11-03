from rest_framework import serializers

from apps.villages.models import CraftVillage

from .models import Document, GlossaryTerm, Theme

# Internal fields (`notes`, `permission_note`) are deliberately absent from every serializer.


class VillageRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = CraftVillage
        fields = ["code", "name", "craft_type"]


class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ["slug", "name"]


class GlossaryTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlossaryTerm
        fields = ["term", "explanation"]


class DocumentListSerializer(serializers.ModelSerializer):
    """Card-sized payload: enough to render a list without the full text."""

    villages = VillageRefSerializer(many=True, read_only=True)
    themes = ThemeSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = ["slug", "title", "genre", "grade_level", "summary", "villages", "themes"]


class DocumentDetailSerializer(DocumentListSerializer):
    glossary = GlossaryTermSerializer(many=True, read_only=True)
    reading_questions = serializers.SerializerMethodField()
    related = serializers.SerializerMethodField()

    class Meta(DocumentListSerializer.Meta):
        fields = [
            *DocumentListSerializer.Meta.fields,
            "body",
            "answer",
            "reading_questions",
            "glossary",
            "author",
            "collector",
            "source",
            "source_url",
            "license",
            "published_at",
            "updated_at",
            "related",
        ]

    def get_reading_questions(self, document: Document) -> list[str]:
        return [line.strip() for line in document.reading_questions.splitlines() if line.strip()]

    def get_related(self, document: Document) -> list[dict]:
        return DocumentListSerializer(self.context.get("related", []), many=True).data


class GenreCountSerializer(serializers.Serializer):
    genre = serializers.CharField()
    count = serializers.IntegerField()
