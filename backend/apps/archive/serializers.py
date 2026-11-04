from rest_framework import serializers

from apps.villages.models import CraftVillage

from .models import Document, GlossaryTerm, Theme

# Internal fields (`notes`, `permission_note`) are deliberately absent from every serializer.


class VillageRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = CraftVillage
        fields = ["code", "name", "craft_type"]


class LocatedVillageRefSerializer(VillageRefSerializer):
    """Village reference plus coordinates, so the reader can draw its mini map.

    Coordinates are plain numbers (or ``null`` while the village is not yet located).
    """

    latitude = serializers.FloatField(read_only=True, allow_null=True)
    longitude = serializers.FloatField(read_only=True, allow_null=True)

    class Meta(VillageRefSerializer.Meta):
        fields = [*VillageRefSerializer.Meta.fields, "latitude", "longitude"]


class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ["slug", "name"]


class GlossaryTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlossaryTerm
        fields = ["term", "explanation"]


EXCERPT_LINES = 4


class DocumentListSerializer(serializers.ModelSerializer):
    """Card-sized payload: enough to render a list without the full text."""

    villages = VillageRefSerializer(many=True, read_only=True)
    themes = ThemeSerializer(many=True, read_only=True)
    excerpt = serializers.SerializerMethodField(
        help_text=f"The first {EXCERPT_LINES} non-blank lines of the body, for verse cards."
    )

    class Meta:
        model = Document
        fields = [
            "slug",
            "title",
            "genre",
            "grade_level",
            "summary",
            "excerpt",
            "answer",
            "villages",
            "themes",
        ]

    def get_excerpt(self, document: Document) -> list[str]:
        lines = (line.strip() for line in document.body.splitlines())
        return [line for line in lines if line][:EXCERPT_LINES]


class DocumentDetailSerializer(DocumentListSerializer):
    villages = LocatedVillageRefSerializer(many=True, read_only=True)
    glossary = GlossaryTermSerializer(many=True, read_only=True)
    reading_questions = serializers.SerializerMethodField()
    related = serializers.SerializerMethodField()

    class Meta(DocumentListSerializer.Meta):
        fields = [
            *DocumentListSerializer.Meta.fields,
            "body",
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


class DocumentSlugSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["slug"]


class GenreCountSerializer(serializers.Serializer):
    genre = serializers.CharField()
    count = serializers.IntegerField()
