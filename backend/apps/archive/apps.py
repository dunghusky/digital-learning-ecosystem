from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ArchiveConfig(AppConfig):
    """Digital archive: folk verses, proverbs, stories and articles about the craft villages."""

    name = "apps.archive"
    label = "archive"
    verbose_name = _("Digital archive")
