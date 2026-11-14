from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers


class LessonRefSerializer(serializers.Serializer):
    """The smallest link to a lesson, for "related lessons" on documents and villages.

    Lives in core and reads plain attributes so the archive and villages apps can show lessons
    without importing the lessons app, which itself builds on them.
    """

    slug = serializers.SlugField(read_only=True)
    title = serializers.CharField(read_only=True)
    subject = serializers.CharField(read_only=True)
    grade = serializers.IntegerField(read_only=True)


class RelatedLessonsMixin(serializers.Serializer):
    """Adds ``lessons``: the published lessons that use this object, lowest grade first."""

    lessons = serializers.SerializerMethodField()

    @extend_schema_field(LessonRefSerializer(many=True))
    def get_lessons(self, obj) -> list[dict]:
        lessons = obj.lessons.published().order_by("grade", "title")
        return LessonRefSerializer(lessons, many=True).data
