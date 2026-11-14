"""A class's results on one quiz, for the teacher.

Students sign up with their school and class as free text, so "the class" is every student
whose school and class match (case-insensitively), as for lesson assignments.
"""

from dataclasses import dataclass
from datetime import datetime

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, OuterRef, Q, Subquery, Sum

from apps.accounts.models import Role
from apps.lessons.models import normalize_class_ref

from .models import AttemptAnswer, Question, Quiz, QuizAttempt

User = get_user_model()


@dataclass(frozen=True)
class StudentResult:
    student: User
    attempt_count: int
    best_score: int | None
    last_score: int | None
    last_submitted_at: datetime | None


@dataclass(frozen=True)
class QuestionStat:
    """How the class did on one question, counting each student's latest attempt only."""

    question: Question
    answered: int
    correct: int


@dataclass(frozen=True)
class ClassResults:
    quiz: Quiz
    max_score: int
    students: list[StudentResult]
    questions: list[QuestionStat]


def _student_result(student: User, row: dict) -> StudentResult:
    return StudentResult(
        student=student,
        attempt_count=row.get("count", 0),
        best_score=row.get("best"),
        last_score=row.get("last"),
        last_submitted_at=row.get("last_at"),
    )


def class_results(quiz: Quiz, school_name: str, class_name: str) -> ClassResults:
    school_name, class_name = normalize_class_ref(school_name, class_name)
    students = list(
        User.objects.filter(
            role=Role.STUDENT, school_name__iexact=school_name, class_name__iexact=class_name
        ).order_by("last_name", "first_name", "username")
    )
    attempts = QuizAttempt.objects.filter(quiz=quiz, student__in=students)
    latest = attempts.filter(student=OuterRef("student")).order_by("-submitted_at", "-pk")
    summary = {
        row["student"]: row
        for row in attempts.values("student").annotate(
            count=Count("pk"),
            best=Max("score"),
            last=Subquery(latest.values("score")[:1]),
            last_at=Max("submitted_at"),
        )
    }
    latest_ids = attempts.filter(pk=Subquery(latest.values("pk")[:1]))

    stats = {
        row["question"]: row
        for row in AttemptAnswer.objects.filter(attempt__in=latest_ids)
        .values("question")
        .annotate(
            answered=Count("pk", filter=~Q(response={})),
            correct=Count("pk", filter=Q(is_correct=True)),
        )
    }
    questions = list(quiz.questions.all())

    return ClassResults(
        quiz=quiz,
        max_score=quiz.questions.aggregate(total=Sum("points"))["total"] or 0,
        students=[_student_result(student, summary.get(student.pk, {})) for student in students],
        questions=[
            QuestionStat(
                question=question,
                answered=stats.get(question.pk, {}).get("answered", 0),
                correct=stats.get(question.pk, {}).get("correct", 0),
            )
            for question in questions
        ],
    )
