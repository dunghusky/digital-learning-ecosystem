from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import PublicationStatus, PublishableModel, TimeStampedModel

# Primary school (grades 1-5) studies Vietnamese; lower secondary (6-9) studies literature.
LAST_PRIMARY_GRADE = 5


class Subject(models.TextChoices):
    VIETNAMESE = "vietnamese", _("Vietnamese (Tieng Viet)")
    LITERATURE = "literature", _("Literature (Ngu van)")


def subject_for_grade(grade: int) -> str:
    return Subject.VIETNAMESE if grade <= LAST_PRIMARY_GRADE else Subject.LITERATURE


class TaskKind(models.TextChoices):
    READING = "reading", _("Reading comprehension")
    WRITING = "writing", _("Writing")
    CREATIVE = "creative", _("Creative work")
    FIELDWORK = "fieldwork", _("Fieldwork at the village")


class Lesson(PublishableModel):
    """A lesson plan a teacher builds around archive documents and craft villages."""

    slug = models.SlugField(
        _("slug"),
        max_length=100,
        unique=True,
        help_text=_("Stable identifier used in URLs, e.g. non-la-tra-loc-lop-7."),
    )
    title = models.CharField(_("title"), max_length=200)
    subject = models.CharField(_("subject"), max_length=16, choices=Subject.choices, db_index=True)
    grade = models.PositiveSmallIntegerField(
        _("grade"),
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        db_index=True,
        help_text=_("1-5 Vietnamese, 6-9 literature."),
    )
    objectives = models.TextField(
        _("objectives"), blank=True, help_text=_("One learning objective per line.")
    )
    introduction = models.TextField(
        _("introduction"), blank=True, help_text=_("How the teacher opens the lesson.")
    )
    expected_output = models.TextField(
        _("expected output"),
        blank=True,
        help_text=_("What students hand in, e.g. a short paragraph about a craft."),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_lessons",
        verbose_name=_("author"),
    )
    documents = models.ManyToManyField(
        "archive.Document",
        through="LessonDocument",
        related_name="lessons",
        blank=True,
        verbose_name=_("documents"),
    )
    villages = models.ManyToManyField(
        "villages.CraftVillage",
        related_name="lessons",
        blank=True,
        verbose_name=_("craft villages"),
    )

    class Meta:
        verbose_name = _("lesson")
        verbose_name_plural = _("lessons")
        ordering = ["grade", "title"]
        indexes = [models.Index(fields=["status", "subject", "grade"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(grade__gte=1, grade__lte=9), name="lesson_grade_1_to_9"
            )
        ]

    def __str__(self) -> str:
        return self.title

    def clean(self) -> None:
        super().clean()
        if self.grade and self.subject and self.subject != subject_for_grade(self.grade):
            raise ValidationError(
                {"subject": _("Grades 1-5 study Vietnamese; grades 6-9 study literature.")}
            )

    @property
    def objective_list(self) -> list[str]:
        return [line.strip() for line in self.objectives.splitlines() if line.strip()]


class LessonDocument(models.Model):
    """An archive document used in a lesson, in reading order, with the teacher's note."""

    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="lesson_documents",
        verbose_name=_("lesson"),
    )
    document = models.ForeignKey(
        "archive.Document",
        on_delete=models.CASCADE,
        related_name="lesson_links",
        verbose_name=_("document"),
    )
    order = models.PositiveSmallIntegerField(_("order"), default=0)
    note = models.CharField(
        _("note"), max_length=300, blank=True, help_text=_("e.g. Read aloud before task 1.")
    )

    class Meta:
        verbose_name = _("lesson document")
        verbose_name_plural = _("lesson documents")
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["lesson", "document"], name="unique_document_per_lesson"
            )
        ]

    def __str__(self) -> str:
        return f"{self.lesson} - {self.document}"


class LessonTask(TimeStampedModel):
    """One thing students do in a lesson; each task gets its own answer in a submission."""

    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="tasks", verbose_name=_("lesson")
    )
    order = models.PositiveSmallIntegerField(_("order"), default=0)
    kind = models.CharField(_("kind"), max_length=16, choices=TaskKind.choices)
    prompt = models.TextField(_("prompt"))
    hint = models.TextField(_("hint"), blank=True, help_text=_("Shown when the student asks."))

    class Meta:
        verbose_name = _("lesson task")
        verbose_name_plural = _("lesson tasks")
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.lesson} #{self.order}"


def normalize_class_ref(school_name: str, class_name: str) -> tuple[str, str]:
    """Same spelling rules as sign-up: trimmed school, upper-case class ("7b" -> "7B")."""
    return " ".join(school_name.split()), "".join(class_name.split()).upper()


class AssignmentQuerySet(models.QuerySet):
    def for_student(self, user) -> "AssignmentQuerySet":
        """Assignments for the class the student typed at sign-up, matched case-insensitively."""
        school_name, class_name = normalize_class_ref(user.school_name, user.class_name)
        if not school_name or not class_name:
            return self.none()
        return self.filter(
            school_name__iexact=school_name,
            class_name__iexact=class_name,
            lesson__status=PublicationStatus.PUBLISHED,
        )


class Assignment(TimeStampedModel):
    """A lesson a teacher gives to one class, identified by school and class name as typed."""

    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="assignments", verbose_name=_("lesson")
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assignments_given",
        verbose_name=_("teacher"),
    )
    school_name = models.CharField(_("school name"), max_length=255)
    class_name = models.CharField(_("class"), max_length=32)
    due_at = models.DateTimeField(_("due at"), null=True, blank=True)
    note = models.TextField(_("note to students"), blank=True)

    objects = AssignmentQuerySet.as_manager()

    class Meta:
        verbose_name = _("assignment")
        verbose_name_plural = _("assignments")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["lesson", "school_name", "class_name"],
                name="unique_lesson_per_class",
            )
        ]

    def __str__(self) -> str:
        return f"{self.lesson} - {self.class_name}, {self.school_name}"

    def save(self, *args, **kwargs):
        self.school_name, self.class_name = normalize_class_ref(self.school_name, self.class_name)
        super().save(*args, **kwargs)

    @property
    def is_overdue(self) -> bool:
        return self.due_at is not None and timezone.now() > self.due_at


class Submission(TimeStampedModel):
    """One student's work on an assignment: a draft until they hand it in."""

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        SUBMITTED = "submitted", _("Submitted")

    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="submissions",
        verbose_name=_("assignment"),
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
        verbose_name=_("student"),
    )
    status = models.CharField(
        _("status"), max_length=16, choices=Status.choices, default=Status.DRAFT
    )
    submitted_at = models.DateTimeField(_("submitted at"), null=True, blank=True)

    class Meta:
        verbose_name = _("submission")
        verbose_name_plural = _("submissions")
        ordering = ["-submitted_at", "-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "student"], name="one_submission_per_student"
            )
        ]

    def __str__(self) -> str:
        return f"{self.student} - {self.assignment}"

    @property
    def is_submitted(self) -> bool:
        return self.status == self.Status.SUBMITTED

    @property
    def is_late(self) -> bool:
        due_at = self.assignment.due_at
        return bool(self.submitted_at and due_at and self.submitted_at > due_at)

    def submit(self) -> None:
        self.status = self.Status.SUBMITTED
        self.submitted_at = timezone.now()
        self.save(update_fields=["status", "submitted_at", "updated_at"])


class Answer(TimeStampedModel):
    """The student's answer to one task of the lesson."""

    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="answers", verbose_name=_("submission")
    )
    task = models.ForeignKey(
        LessonTask, on_delete=models.CASCADE, related_name="answers", verbose_name=_("task")
    )
    text = models.TextField(_("answer"), blank=True)

    class Meta:
        verbose_name = _("answer")
        verbose_name_plural = _("answers")
        ordering = ["task__order", "task_id"]
        constraints = [
            models.UniqueConstraint(fields=["submission", "task"], name="one_answer_per_task")
        ]

    def __str__(self) -> str:
        return f"{self.submission} #{self.task.order}"


class Feedback(TimeStampedModel):
    """The teacher's comment and optional score on a handed-in submission."""

    submission = models.OneToOneField(
        Submission, on_delete=models.CASCADE, related_name="feedback", verbose_name=_("submission")
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="feedback_given",
        verbose_name=_("teacher"),
    )
    comment = models.TextField(_("comment"))
    score = models.DecimalField(
        _("score"),
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        help_text=_("Out of 10. Leave empty for comment-only feedback."),
    )

    class Meta:
        verbose_name = _("feedback")
        verbose_name_plural = _("feedback")

    def __str__(self) -> str:
        return f"{_('Feedback')}: {self.submission}"
