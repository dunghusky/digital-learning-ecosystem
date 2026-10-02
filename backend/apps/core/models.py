from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """Adds creation and update timestamps. Base class for every content model."""

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        abstract = True


class PublicationStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    PENDING = "pending", _("Pending review")
    PUBLISHED = "published", _("Published")
    REJECTED = "rejected", _("Rejected")


class PublishedQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status=PublicationStatus.PUBLISHED)


class PublishableModel(TimeStampedModel):
    """Editorial workflow shared by every public-facing content model: content is only
    visible to anonymous visitors once an editor has published it."""

    status = models.CharField(
        _("status"),
        max_length=16,
        choices=PublicationStatus.choices,
        default=PublicationStatus.DRAFT,
        db_index=True,
    )
    published_at = models.DateTimeField(_("published at"), null=True, blank=True)

    objects = PublishedQuerySet.as_manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # Stamp the first publication; keep the original date on later edits.
        if self.is_published and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_published(self) -> bool:
        return self.status == PublicationStatus.PUBLISHED
