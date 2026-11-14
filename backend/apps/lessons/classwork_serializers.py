"""Serializers for assignments, submissions and feedback (the signed-in part of lessons)."""

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.serializers import LessonRefSerializer

from .models import Answer, Assignment, Feedback, Lesson, Submission, normalize_class_ref

MAX_ANSWER_LENGTH = 20_000


class PersonSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)


class FeedbackSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ["comment", "score", "teacher_name", "updated_at"]
        read_only_fields = ["teacher_name", "updated_at"]
        extra_kwargs = {"score": {"coerce_to_string": False}}

    def get_teacher_name(self, feedback: Feedback) -> str:
        return feedback.teacher.display_name if feedback.teacher else ""


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ["task", "text"]


class SubmissionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    is_late = serializers.BooleanField(read_only=True)
    feedback = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = ["id", "status", "submitted_at", "is_late", "answers", "feedback", "updated_at"]

    def get_feedback(self, submission: Submission) -> dict | None:
        feedback = getattr(submission, "feedback", None)
        return FeedbackSerializer(feedback).data if feedback else None


class AnswerInputSerializer(serializers.Serializer):
    task = serializers.IntegerField()
    text = serializers.CharField(
        allow_blank=True, max_length=MAX_ANSWER_LENGTH, trim_whitespace=False
    )


class AnswersInputSerializer(serializers.Serializer):
    """Answers to save, checked against the tasks of the assignment's lesson (in context)."""

    answers = AnswerInputSerializer(many=True)

    def validate_answers(self, answers: list[dict]) -> list[dict]:
        lesson: Lesson = self.context["lesson"]
        task_ids = set(lesson.tasks.values_list("pk", flat=True))
        seen: set[int] = set()
        for answer in answers:
            if answer["task"] not in task_ids:
                raise serializers.ValidationError(_("This task is not part of the lesson."))
            if answer["task"] in seen:
                raise serializers.ValidationError(_("Each task can be answered only once."))
            seen.add(answer["task"])
        return answers


class StudentAssignmentSerializer(serializers.ModelSerializer):
    """An assignment as the student sees it, with their own submission (or null)."""

    lesson = LessonRefSerializer(read_only=True)
    teacher_name = serializers.CharField(source="teacher.display_name", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ["id", "lesson", "teacher_name", "due_at", "note", "is_overdue", "submission"]

    def get_submission(self, assignment: Assignment) -> dict | None:
        # The view prefetches only the current student's submission into `mine`.
        mine = getattr(assignment, "mine", [])
        return SubmissionSerializer(mine[0]).data if mine else None


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    lesson = serializers.SlugRelatedField(slug_field="slug", queryset=Lesson.objects.published())
    lesson_detail = LessonRefSerializer(source="lesson", read_only=True)
    submitted_count = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Assignment
        fields = [
            "id",
            "lesson",
            "lesson_detail",
            "school_name",
            "class_name",
            "due_at",
            "note",
            "is_overdue",
            "submitted_count",
            "created_at",
        ]
        # Uniqueness is checked on the normalized names in validate().
        validators = []

    def validate(self, attrs: dict) -> dict:
        instance: Assignment | None = self.instance
        lesson = attrs.get("lesson", instance and instance.lesson)
        school_name, class_name = normalize_class_ref(
            attrs.get("school_name", instance.school_name if instance else ""),
            attrs.get("class_name", instance.class_name if instance else ""),
        )
        if not school_name:
            raise serializers.ValidationError({"school_name": _("This field may not be blank.")})
        if not class_name:
            raise serializers.ValidationError({"class_name": _("This field may not be blank.")})
        duplicates = Assignment.objects.filter(
            lesson=lesson, school_name__iexact=school_name, class_name__iexact=class_name
        )
        if instance:
            duplicates = duplicates.exclude(pk=instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                {"class_name": _("This lesson is already assigned to this class.")}
            )
        return attrs | {"school_name": school_name, "class_name": class_name}


class ClassSubmissionSerializer(serializers.Serializer):
    """One row of the teacher's class list: a student and their submission, if any."""

    student = PersonSerializer(read_only=True)
    submission = SubmissionSerializer(read_only=True, allow_null=True)

    def to_representation(self, row: dict) -> dict:
        data = super().to_representation(row)
        # A draft is the student's own until handed in: the teacher sees only that it exists.
        if data["submission"] and data["submission"]["status"] == Submission.Status.DRAFT:
            data["submission"]["answers"] = []
        return data
