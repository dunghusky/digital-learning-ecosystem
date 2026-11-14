from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Role(models.TextChoices):
    """What a person does in the system. Fine-grained permissions can still be layered on
    with Django groups; the role drives the UI and the coarse API checks."""

    STUDENT = "student", _("Student")
    TEACHER = "teacher", _("Teacher")
    SCHOOL_ADMIN = "school_admin", _("School administrator")
    EDITOR = "editor", _("Editor")


phone_validator = RegexValidator(
    r"^\+?[0-9]{9,15}$", _("Enter a phone number of 9 to 15 digits, optionally starting with +.")
)


class User(AbstractUser):
    """Custom user model. Students sign themselves up with a username and password of
    their own; phone and email are optional, school and class are required for students
    and stored as typed so sign-up never blocks on a missing classroom record."""

    role = models.CharField(
        _("role"), max_length=16, choices=Role.choices, default=Role.STUDENT, db_index=True
    )
    phone = models.CharField(
        _("phone number"), max_length=16, blank=True, validators=[phone_validator]
    )
    school_name = models.CharField(_("school name"), max_length=255, blank=True)
    class_name = models.CharField(_("class name"), max_length=32, blank=True)

    class Meta(AbstractUser.Meta):
        verbose_name = _("user")
        verbose_name_plural = _("users")

    @property
    def display_name(self) -> str:
        return self.get_full_name() or self.username

    @property
    def is_student(self) -> bool:
        return self.role == Role.STUDENT

    @property
    def is_teacher(self) -> bool:
        return self.role == Role.TEACHER

    @property
    def is_school_admin(self) -> bool:
        return self.role == Role.SCHOOL_ADMIN or self.is_superuser


class School(TimeStampedModel):
    """Official school records that teachers attach classrooms to. Self sign-up only
    stores the typed school name on the user; linking is done later by staff."""

    code = models.SlugField(_("code"), max_length=64, unique=True)
    name = models.CharField(_("name"), max_length=255)
    commune = models.CharField(_("commune"), max_length=255, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("school")
        verbose_name_plural = _("schools")

    def __str__(self) -> str:
        return self.name


class Classroom(TimeStampedModel):
    school = models.ForeignKey(
        School, verbose_name=_("school"), on_delete=models.PROTECT, related_name="classrooms"
    )
    name = models.CharField(_("name"), max_length=32, help_text=_("For example 6A or 3B."))
    grade = models.PositiveSmallIntegerField(_("grade"), help_text=_("1-5 primary, 6-9 secondary."))
    school_year = models.CharField(
        _("school year"), max_length=9, help_text=_("For example 2026-2027.")
    )
    members = models.ManyToManyField(
        User, through="ClassMembership", related_name="classrooms", verbose_name=_("members")
    )

    class Meta:
        ordering = ["-school_year", "grade", "name"]
        verbose_name = _("classroom")
        verbose_name_plural = _("classrooms")
        constraints = [
            models.UniqueConstraint(
                fields=["school", "school_year", "name"], name="unique_classroom_per_year"
            ),
            models.CheckConstraint(
                condition=models.Q(grade__gte=1, grade__lte=9), name="classroom_grade_1_to_9"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.school_year})"

    @property
    def is_primary(self) -> bool:
        return self.grade <= 5


class ClassMembership(TimeStampedModel):
    class Kind(models.TextChoices):
        STUDENT = "student", _("Student")
        TEACHER = "teacher", _("Teacher")

    classroom = models.ForeignKey(
        Classroom, verbose_name=_("classroom"), on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        User, verbose_name=_("user"), on_delete=models.CASCADE, related_name="memberships"
    )
    kind = models.CharField(_("kind"), max_length=16, choices=Kind.choices, default=Kind.STUDENT)

    class Meta:
        ordering = ["classroom", "user__last_name", "user__first_name"]
        verbose_name = _("class membership")
        verbose_name_plural = _("class memberships")
        constraints = [
            models.UniqueConstraint(fields=["classroom", "user"], name="unique_class_member"),
        ]

    def __str__(self) -> str:
        return f"{self.user} @ {self.classroom}"
