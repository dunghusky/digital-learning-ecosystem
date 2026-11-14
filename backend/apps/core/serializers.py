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


class QuizRefSerializer(serializers.Serializer):
    """The smallest link to a quiz, for "quizzes" on lessons, documents and villages."""

    slug = serializers.SlugField(read_only=True)
    title = serializers.CharField(read_only=True)
    grade_level = serializers.CharField(read_only=True)
    time_limit_minutes = serializers.IntegerField(read_only=True, allow_null=True)


class RelatedQuizzesMixin(serializers.Serializer):
    """Adds ``quizzes``: the published quizzes about this object, by title.

    By default they are ``obj.quizzes`` (lessons and villages link quizzes directly); override
    ``related_quizzes`` when the link is indirect, as for documents used in quiz questions.
    """

    quizzes = serializers.SerializerMethodField()

    def related_quizzes(self, obj):
        return obj.quizzes.all()

    @extend_schema_field(QuizRefSerializer(many=True))
    def get_quizzes(self, obj) -> list[dict]:
        quizzes = self.related_quizzes(obj).published().distinct().order_by("title")
        return QuizRefSerializer(quizzes, many=True).data
