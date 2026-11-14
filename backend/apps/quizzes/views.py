from django.db import transaction
from django.db.models import Count, Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from django_filters import rest_framework as django_filters
from drf_spectacular.utils import extend_schema
from rest_framework import filters, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.archive.models import GradeLevel
from apps.core.filters import AccentInsensitiveSearchFilter
from apps.lessons.models import Lesson
from apps.lessons.permissions import IsTeacher
from apps.villages.models import CraftVillage

from .class_results import class_results
from .grading import GradedQuiz, grade_quiz
from .models import AttemptAnswer, Question, Quiz, QuizAttempt
from .serializers import (
    ClassResultsQuerySerializer,
    ClassResultsSerializer,
    GradedAnswerSerializer,
    QuizAttemptSerializer,
    QuizDetailSerializer,
    QuizListSerializer,
    SubmitSerializer,
)


class QuizFilter(django_filters.FilterSet):
    grade_level = django_filters.ChoiceFilter(choices=GradeLevel.choices)
    village = django_filters.CharFilter(field_name="villages__code", label="Village code")
    lesson = django_filters.CharFilter(field_name="lesson__slug", label="Lesson slug")

    class Meta:
        model = Quiz
        fields = ["grade_level", "village", "lesson"]


def published_quizzes() -> QuerySet[Quiz]:
    """Published quizzes whose links only point at published lessons and villages."""
    return (
        Quiz.objects.published()
        .annotate(question_count=Count("questions", distinct=True))
        .prefetch_related(
            Prefetch("villages", queryset=CraftVillage.objects.published()),
            Prefetch("lesson", queryset=Lesson.objects.published()),
        )
        .order_by("title", "pk")
    )


class QuizViewSet(viewsets.ReadOnlyModelViewSet):
    """Public quizzes. Anyone may take one; a signed-in student's result is also saved."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [
        django_filters.DjangoFilterBackend,
        AccentInsensitiveSearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = QuizFilter
    search_fields = ["title", "description", "villages__name"]
    ordering_fields = ["title", "published_at"]

    def get_queryset(self) -> QuerySet[Quiz]:
        queryset = published_quizzes()
        if self.action in {"retrieve", "submit"}:
            queryset = queryset.prefetch_related(
                Prefetch(
                    "questions",
                    queryset=Question.objects.prefetch_related("choices", "pairs"),
                )
            )
        return queryset

    def filter_queryset(self, queryset: QuerySet[Quiz]) -> QuerySet[Quiz]:
        return super().filter_queryset(queryset).distinct()

    def get_serializer_class(self):
        return QuizDetailSerializer if self.action == "retrieve" else QuizListSerializer

    def get_throttles(self):
        # Grading is the only write anyone can do here, signed in or not.
        self.throttle_scope = "quiz" if self.action == "submit" else None
        return super().get_throttles()

    @extend_schema(request=SubmitSerializer, responses=None)
    @action(detail=True, methods=["post"])
    def submit(self, request: Request, slug: str) -> Response:
        """Grade the answers; returns the score and, now that it is over, the solutions."""
        quiz = self.get_object()
        submission = SubmitSerializer(data=request.data, context={"quiz": quiz})
        submission.is_valid(raise_exception=True)
        graded = grade_quiz(quiz.questions.all(), submission.responses())

        attempt = None
        user = request.user
        if user.is_authenticated and user.is_student:
            attempt = save_attempt(
                quiz, user, graded, submission.validated_data.get("duration_seconds")
            )
        return Response(
            {
                "score": graded.score,
                "max_score": graded.max_score,
                "saved": attempt is not None,
                "attempt": attempt.pk if attempt else None,
                "results": GradedAnswerSerializer(graded.answers, many=True).data,
            }
        )


@transaction.atomic
def save_attempt(quiz: Quiz, student, graded: GradedQuiz, duration: int | None) -> QuizAttempt:
    attempt = QuizAttempt.objects.create(
        quiz=quiz,
        student=student,
        score=graded.score,
        max_score=graded.max_score,
        duration_seconds=duration,
    )
    AttemptAnswer.objects.bulk_create(
        AttemptAnswer(
            attempt=attempt,
            question=answer.question,
            response=answer.response,
            is_correct=answer.is_correct,
            points_awarded=answer.points_awarded,
        )
        for answer in graded.answers
    )
    return attempt


class MyQuizAttemptViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """The signed-in user's own results, newest first; ``?quiz=<slug>`` for one quiz."""

    permission_classes = [IsAuthenticated]
    serializer_class = QuizAttemptSerializer

    def get_queryset(self) -> QuerySet[QuizAttempt]:
        queryset = QuizAttempt.objects.filter(student=self.request.user).select_related("quiz")
        slug = self.request.query_params.get("quiz")
        return queryset.filter(quiz__slug=slug) if slug else queryset


class TeacherQuizResultsView(APIView):
    """How a class did on a quiz: each student's best and latest score, and which questions
    the class found hard (from each student's latest attempt)."""

    permission_classes = [IsTeacher]

    @extend_schema(
        parameters=[ClassResultsQuerySerializer],
        responses=ClassResultsSerializer,
        summary="A class's results on one quiz",
    )
    def get(self, request: Request) -> Response:
        query = ClassResultsQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        quiz = get_object_or_404(Quiz, slug=query.validated_data["quiz"])
        results = class_results(
            quiz, query.validated_data["school_name"], query.validated_data["class_name"]
        )
        return Response(ClassResultsSerializer(results).data)
