from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class LessonsConfig(AppConfig):
    """Vietnamese and literature lessons built on the archive and the craft villages."""

    name = "apps.lessons"
    label = "lessons"
    verbose_name = _("Lessons")
