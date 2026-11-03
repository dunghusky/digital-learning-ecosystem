from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import PublishableModel, TimeStampedModel


class Genre(models.TextChoices):
    FOLK_VERSE = "folk_verse", _("Folk verse")
    PROVERB = "proverb", _("Proverb")
    WORK_SONG = "work_song", _("Work song")
    NARRATIVE_VERSE = "narrative_verse", _("Narrative verse")
    RIDDLE = "riddle", _("Riddle")
    NURSERY_RHYME = "nursery_rhyme", _("Nursery rhyme")
    LEGEND = "legend", _("Legend")
    FOLK_TALE = "folk_tale", _("Folk tale")
    POEM = "poem", _("Poem")
    ESSAY = "essay", _("Essay")
    REPORTAGE = "reportage", _("Reportage")
    INTERVIEW = "interview", _("Artisan interview")


# Folk works have no single author, so the law asks us to cite where they were collected.
FOLK_GENRES = frozenset(
    {
        Genre.FOLK_VERSE,
        Genre.PROVERB,
        Genre.WORK_SONG,
        Genre.NARRATIVE_VERSE,
        Genre.RIDDLE,
        Genre.NURSERY_RHYME,
        Genre.LEGEND,
        Genre.FOLK_TALE,
    }
)


class GradeLevel(models.TextChoices):
    PRIMARY = "primary", _("Primary school")
    SECONDARY = "secondary", _("Lower secondary school")
    ALL = "all", _("All grades")


class License(models.TextChoices):
    FOLK_ATTRIBUTED = "folk_attributed", _("Folk work, source cited")
    OWN_WORK = "own_work", _("Written by our teachers or students")
    PERMISSION_GRANTED = "permission_granted", _("Used with the author's permission")
    CC_BY = "cc_by", _("Creative Commons Attribution")
    UNKNOWN = "unknown", _("Unknown (cannot be published)")


class Theme(models.Model):
    """Free topic tag such as "que-huong" or "lao-dong", shared across documents."""

    slug = models.SlugField(_("slug"), max_length=64, unique=True)
    name = models.CharField(_("name"), max_length=100)

    class Meta:
        verbose_name = _("theme")
        verbose_name_plural = _("themes")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Document(PublishableModel):
    slug = models.SlugField(
        _("slug"),
        max_length=100,
        unique=True,
        help_text=_("Stable identifier used in URLs and data imports, e.g. ai-ve-bo-lieu."),
    )
    title = models.CharField(_("title"), max_length=200)
    genre = models.CharField(_("genre"), max_length=32, choices=Genre.choices, db_index=True)
    body = models.TextField(_("body"), help_text=_("Line breaks are kept as written."))
    summary = models.TextField(_("summary"), blank=True)
    answer = models.CharField(
        _("answer"),
        max_length=255,
        blank=True,
        help_text=_("Riddles only: shown after the reader has guessed."),
    )

    villages = models.ManyToManyField(
        "villages.CraftVillage",
        related_name="documents",
        blank=True,
        verbose_name=_("craft villages"),
    )
    themes = models.ManyToManyField(
        Theme, related_name="documents", blank=True, verbose_name=_("themes")
    )
    grade_level = models.CharField(
        _("grade level"),
        max_length=16,
        choices=GradeLevel.choices,
        default=GradeLevel.ALL,
        db_index=True,
    )
    reading_questions = models.TextField(
        _("reading questions"), blank=True, help_text=_("One question per line.")
    )

    author = models.CharField(
        _("author"), max_length=200, blank=True, help_text=_("Leave empty for folk works.")
    )
    collector = models.CharField(
        _("collector"), max_length=200, blank=True, help_text=_("e.g. Nguyen Van A, class 8A.")
    )
    source = models.CharField(
        _("source"),
        max_length=500,
        blank=True,
        help_text=_("Book, page or informant. Required for folk genres."),
    )
    source_url = models.URLField(_("source URL"), max_length=500, blank=True)
    license = models.CharField(
        _("license"), max_length=32, choices=License.choices, default=License.UNKNOWN
    )
    permission_note = models.TextField(
        _("permission note"),
        blank=True,
        help_text=_("Who agreed and when. Never shown on the public site."),
    )
    notes = models.TextField(
        _("internal notes"), blank=True, help_text=_("Never shown on the public site.")
    )

    class Meta:
        verbose_name = _("document")
        verbose_name_plural = _("documents")
        ordering = ["title"]
        indexes = [models.Index(fields=["status", "genre"])]

    def __str__(self) -> str:
        return self.title

    def clean(self) -> None:
        super().clean()
        errors: dict[str, str] = {}
        if self.is_published and self.license == License.UNKNOWN:
            errors["license"] = _("Choose a license before publishing.")
        if self.is_folk and not self.source.strip():
            errors["source"] = _("Folk works must cite where they were collected.")
        if self.answer and self.genre != Genre.RIDDLE:
            errors["answer"] = _("Only riddles have an answer.")
        if errors:
            raise ValidationError(errors)

    @property
    def is_folk(self) -> bool:
        return self.genre in FOLK_GENRES


class GlossaryTerm(TimeStampedModel):
    """Explains a local or archaic word in a document, e.g. "mạ: mẹ" for young readers."""

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="glossary", verbose_name=_("document")
    )
    term = models.CharField(_("term"), max_length=100)
    explanation = models.CharField(_("explanation"), max_length=500)

    class Meta:
        verbose_name = _("glossary term")
        verbose_name_plural = _("glossary terms")
        ordering = ["term"]
        constraints = [
            models.UniqueConstraint(fields=["document", "term"], name="unique_term_per_document")
        ]

    def __str__(self) -> str:
        return self.term
