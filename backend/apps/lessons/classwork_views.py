"""Assignments, submissions and feedback: students hand in work, teachers review it."""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Prefetch, Q, QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from apps.accounts.models import Role

from .classwork_serializers import (
    AnswersInputSerializer,
    ClassSubmissionSerializer,
    FeedbackSerializer,
    StudentAssignmentSerializer,
    SubmissionSerializer,
    TeacherAssignmentSerializer,
)
from .models import Answer, Assignment, Feedback, Submission
from .permissions import IsStudent, IsTeacher

User = get_user_model()


class AlreadySubmitted(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This work has already been handed in and can no longer be changed."
    default_code = "already_submitted"


def with_answers(queryset: QuerySet[Submission]) -> QuerySet[Submission]:
    return queryset.select_related("feedback__teacher", "assignment").prefetch_related("answers")


def save_answers(submission: Submission, answers: list[dict]) -> None:
    """Creates or overwrites the given answers; tasks not mentioned keep their saved text."""
    for answer in answers:
        Answer.objects.update_or_create(
            submission=submission, task_id=answer["task"], defaults={"text": answer["text"]}
        )


class StudentAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """The signed-in student's assignments: those given to their school and class."""

    permission_classes = [IsStudent]
    serializer_class = StudentAssignmentSerializer
    pagination_class = None

    def get_queryset(self) -> QuerySet[Assignment]:
        if getattr(self, "swagger_fake_view", False):  # Schema generation: no user.
            return Assignment.objects.none()
        mine = with_answers(Submission.objects.filter(student=self.request.user))
        return (
            Assignment.objects.for_student(self.request.user)
            .select_related("lesson", "teacher")
            .prefetch_related(Prefetch("submissions", queryset=mine, to_attr="mine"))
            .order_by("-created_at")
        )

    def _submission(self, assignment: Assignment) -> Submission | None:
        return assignment.mine[0] if assignment.mine else None  # ty: ignore[unresolved-attribute]

    def _save(self, request: Request, assignment: Assignment) -> Submission:
        """Validates the posted answers and stores them on the (possibly new) draft."""
        submission = self._submission(assignment)
        if submission and submission.is_submitted:
            raise AlreadySubmitted
        data = AnswersInputSerializer(data=request.data, context={"lesson": assignment.lesson})
        data.is_valid(raise_exception=True)
        if submission is None:
            submission, _ = Submission.objects.get_or_create(
                assignment=assignment, student=request.user
            )
        save_answers(submission, data.validated_data["answers"])
        return submission

    @extend_schema(
        methods=["GET"],
        summary="My work on an assignment",
        description="404 until the student saves a first draft.",
        responses=SubmissionSerializer,
    )
    @extend_schema(
        methods=["PUT"],
        summary="Save a draft",
        request=AnswersInputSerializer,
        responses=SubmissionSerializer,
    )
    @action(detail=True, methods=["get", "put"])
    def submission(self, request: Request, pk=None) -> Response:
        assignment = self.get_object()
        if request.method == "GET":
            submission = self._submission(assignment)
            if submission is None:
                return Response({"detail": "No draft yet."}, status=status.HTTP_404_NOT_FOUND)
        else:
            with transaction.atomic():
                submission = self._save(request, assignment)
        return Response(
            SubmissionSerializer(with_answers(Submission.objects).get(pk=submission.pk)).data
        )

    @extend_schema(
        summary="Hand in the work",
        description="Saves the posted answers, then hands the work in. It cannot change after.",
        request=AnswersInputSerializer,
        responses=SubmissionSerializer,
    )
    @action(detail=True, methods=["post"])
    def submit(self, request: Request, pk=None) -> Response:
        assignment = self.get_object()
        with transaction.atomic():
            submission = self._save(request, assignment)
            if not submission.answers.exclude(text__regex=r"^\s*$").exists():
                raise ValidationError({"answers": ["Answer at least one task before handing in."]})
            submission.submit()
        return Response(
            SubmissionSerializer(with_answers(Submission.objects).get(pk=submission.pk)).data
        )


class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    """Assignments the signed-in teacher gave. School admins see every assignment."""

    permission_classes = [IsTeacher]
    serializer_class = TeacherAssignmentSerializer
    pagination_class = None

    def get_queryset(self) -> QuerySet[Assignment]:
        if getattr(self, "swagger_fake_view", False):  # Schema generation: no user.
            return Assignment.objects.none()
        submitted = Q(submissions__status=Submission.Status.SUBMITTED)
        queryset = Assignment.objects.select_related("lesson").annotate(
            submitted_count=Count("submissions", filter=submitted)
        )
        if not self.request.user.is_school_admin:
            queryset = queryset.filter(teacher=self.request.user)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer: TeacherAssignmentSerializer) -> None:
        serializer.save(teacher=self.request.user)

    @extend_schema(
        summary="The class and its work",
        description=(
            "Every student whose school and class match the assignment, plus anyone who already "
            "worked on it, with their submission (null when they have not started)."
        ),
        responses=ClassSubmissionSerializer(many=True),
    )
    @action(detail=True)
    def submissions(self, request: Request, pk=None) -> Response:
        assignment = self.get_object()
        by_student = {
            submission.student_id: submission
            for submission in with_answers(assignment.submissions.all())
        }
        students = (
            User.objects.filter(
                Q(
                    role=Role.STUDENT,
                    school_name__iexact=assignment.school_name,
                    class_name__iexact=assignment.class_name,
                )
                | Q(pk__in=by_student.keys())
            )
            .distinct()
            .order_by("last_name", "first_name", "username")
        )
        rows = [
            {"student": student, "submission": by_student.get(student.pk)} for student in students
        ]
        return Response(ClassSubmissionSerializer(rows, many=True).data)


class TeacherSubmissionViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Handed-in work on the teacher's assignments, and the feedback on it."""

    permission_classes = [IsTeacher]
    serializer_class = SubmissionSerializer

    def get_queryset(self) -> QuerySet[Submission]:
        if getattr(self, "swagger_fake_view", False):  # Schema generation: no user.
            return Submission.objects.none()
        queryset = with_answers(Submission.objects.filter(status=Submission.Status.SUBMITTED))
        if not self.request.user.is_school_admin:
            queryset = queryset.filter(assignment__teacher=self.request.user)
        return queryset

    @extend_schema(
        summary="Give or update feedback",
        request=FeedbackSerializer,
        responses=SubmissionSerializer,
    )
    @action(detail=True, methods=["put"])
    def feedback(self, request: Request, pk=None) -> Response:
        submission = self.get_object()
        current = Feedback.objects.filter(submission=submission).first()
        serializer = FeedbackSerializer(current, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(submission=submission, teacher=request.user)
        submission = get_object_or_404(self.get_queryset(), pk=submission.pk)
        return Response(SubmissionSerializer(submission).data)
