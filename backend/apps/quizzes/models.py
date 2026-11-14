from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.archive.models import GradeLevel
from apps.core.models import PublishableModel, TimeStampedModel

from .rules import (
    BLANK,
    CHOICE_KINDS,
    TYPED_ANSWER_KINDS,
    ChoiceRow,
    PairRow,
    QuestionKind,
    choice_errors,
    pair_errors,
)

MAX_POINTS = 10


class Quiz(PublishableModel):
    """A graded quiz. Anyone can take a published quiz; only signed-in students' scores are kept."""

    slug = models.SlugField(
        _("slug"),
        max_length=100,
        unique=True,
        help_text=_("Stable identifier used in URLs, e.g. do-vui-non-la."),
    )
    title = models.CharField(_("title"), max_length=200)
    description = models.TextField(_("description"), blank=True)
    grade_level = models.CharField(
        _("grade level"),
        max_length=16,
        choices=GradeLevel.choices,
        default=GradeLevel.ALL,
        db_index=True,
    )
    time_limit_minutes = models.PositiveSmallIntegerField(
        _("time limit (minutes)"),
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        help_text=_("Leave empty for no time limit."),
    )
    shuffle_questions = models.BooleanField(_("shuffle questions"), default=False)
    lesson = models.ForeignKey(
        "lessons.Lesson",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
        verbose_name=_("lesson"),
        help_text=_("Shown at the end of this lesson."),
    )
    villages = models.ManyToManyField(
        "villages.CraftVillage",
        related_name="quizzes",
        blank=True,
        verbose_name=_("craft villages"),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_quizzes",
        verbose_name=_("author"),
    )

    class Meta:
        verbose_name = _("quiz")
        verbose_name_plural = _("quizzes")
        ordering = ["title"]
        indexes = [models.Index(fields=["status", "grade_level"])]

    def __str__(self) -> str:
        return self.title

    def clean(self) -> None:
        super().clean()
        # A brand-new quiz has no questions yet; it is checked again when it gets published.
        if self.is_published and self.pk:
            problems = self.publishing_problems()
            if problems:
                raise ValidationError({"status": problems})

    def publishing_problems(self) -> list[str]:
        """Why this quiz cannot be published yet; empty when it is ready."""
        questions = list(self.questions.prefetch_related("choices", "pairs"))
        if not questions:
            return [str(_("Add at least one question before publishing."))]
        return [
            f"{_('Question')} {question.order}: {message}"
            for question in questions
            for message in question.completeness_errors()
        ]


class Question(TimeStampedModel):
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="questions", verbose_name=_("quiz")
    )
    order = models.PositiveSmallIntegerField(_("order"), default=0)
    kind = models.CharField(_("kind"), max_length=16, choices=QuestionKind.choices)
    prompt = models.TextField(
        _("prompt"),
        help_text=_("For fill in the blank, write %(blank)s where the missing word goes.")
        % {"blank": BLANK},
    )
    image_url = models.URLField(
        _("image URL"),
        max_length=500,
        blank=True,
        help_text=_("Required for 'guess from a picture'; optional for the other kinds."),
    )
    accepted_answers = models.TextField(
        _("accepted answers"),
        blank=True,
        help_text=_(
            "Fill in the blank and riddles: one accepted answer per line. Case and extra spaces "
            "are ignored; Vietnamese accents are not."
        ),
    )
    points = models.PositiveSmallIntegerField(
        _("points"), default=1, validators=[MinValueValidator(1), MaxValueValidator(MAX_POINTS)]
    )
    explanation = models.TextField(
        _("explanation"), blank=True, help_text=_("Shown after the student answers.")
    )
    document = models.ForeignKey(
        "archive.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quiz_questions",
        verbose_name=_("source document"),
        help_text=_("The folk verse or riddle this question comes from."),
    )

    class Meta:
        verbose_name = _("question")
        verbose_name_plural = _("questions")
        ordering = ["quiz", "order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(points__gte=1, points__lte=MAX_POINTS),
                name="question_points_in_range",
            )
        ]

    def __str__(self) -> str:
        return f"{self.quiz} #{self.order}"

    def clean(self) -> None:
        super().clean()
        errors: dict[str, str] = {}
        if self.kind == QuestionKind.FILL_BLANK and self.prompt.count(BLANK) != 1:
            errors["prompt"] = _("Write %(blank)s exactly once where the missing word goes.") % {
                "blank": BLANK
            }
        if self.kind in TYPED_ANSWER_KINDS and not self.answer_list:
            errors["accepted_answers"] = _("Give at least one accepted answer.")
        if self.kind not in TYPED_ANSWER_KINDS and self.accepted_answers.strip():
            errors["accepted_answers"] = _("Only fill in the blank and riddles take typed answers.")
        if self.kind == QuestionKind.IMAGE_CHOICE and not self.image_url:
            errors["image_url"] = _("A picture question needs an image.")
        if errors:
            raise ValidationError(errors)

    @property
    def answer_list(self) -> list[str]:
        return [line.strip() for line in self.accepted_answers.splitlines() if line.strip()]

    @property
    def has_choices(self) -> bool:
        return self.kind in CHOICE_KINDS

    def completeness_errors(self) -> list[str]:
        """Own field rules plus the rules on its saved choices and pairs."""
        try:
            self.clean()
            errors = []
        except ValidationError as error:
            errors = list(error.messages)
        choices = [ChoiceRow(c.text, c.is_correct) for c in self.choices.all()]
        pairs = [PairRow(p.left, p.right) for p in self.pairs.all()]
        return errors + choice_errors(self.kind, choices) + pair_errors(self.kind, pairs)


class Choice(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="choices", verbose_name=_("question")
    )
    order = models.PositiveSmallIntegerField(_("order"), default=0)
    text = models.CharField(_("text"), max_length=300)
    is_correct = models.BooleanField(_("correct"), default=False)

    class Meta:
        verbose_name = _("choice")
        verbose_name_plural = _("choices")
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.text


class MatchPair(models.Model):
    """One correct match, e.g. 'Tra Loc' ↔ 'non la'. Right sides are shuffled for students."""

    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="pairs", verbose_name=_("question")
    )
    order = models.PositiveSmallIntegerField(_("order"), default=0)
    left = models.CharField(_("left"), max_length=200)
    right = models.CharField(_("right"), max_length=200)

    class Meta:
        verbose_name = _("matching pair")
        verbose_name_plural = _("matching pairs")
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.left} ↔ {self.right}"


class QuizAttempt(models.Model):
    """One finished try at a quiz by a signed-in student. Guests are graded but not stored."""

    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="attempts", verbose_name=_("quiz")
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
        verbose_name=_("student"),
    )
    score = models.PositiveSmallIntegerField(_("score"))
    max_score = models.PositiveSmallIntegerField(_("max score"))
    duration_seconds = models.PositiveIntegerField(
        _("duration (seconds)"), null=True, blank=True, help_text=_("As reported by the app.")
    )
    submitted_at = models.DateTimeField(_("submitted at"), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("quiz attempt")
        verbose_name_plural = _("quiz attempts")
        ordering = ["-submitted_at", "-id"]
        indexes = [models.Index(fields=["student", "quiz"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(score__lte=models.F("max_score")),
                name="attempt_score_at_most_max",
            )
        ]

    def __str__(self) -> str:
        return f"{self.student} - {self.quiz} ({self.score}/{self.max_score})"


class AttemptAnswer(models.Model):
    """What the student answered to one question, kept so teachers can see common mistakes."""

    attempt = models.ForeignKey(
        QuizAttempt, on_delete=models.CASCADE, related_name="answers", verbose_name=_("attempt")
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="attempt_answers",
        verbose_name=_("question"),
    )
    response = models.JSONField(_("response"), default=dict, blank=True)
    is_correct = models.BooleanField(_("correct"))
    points_awarded = models.PositiveSmallIntegerField(_("points awarded"))

    class Meta:
        verbose_name = _("attempt answer")
        verbose_name_plural = _("attempt answers")
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"], name="one_answer_per_question_per_attempt"
            )
        ]

    def __str__(self) -> str:
        return f"{self.attempt} #{self.question.order}"
