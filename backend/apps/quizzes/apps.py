from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class QuizzesConfig(AppConfig):
    """Graded quizzes on craft villages and folk literature, built from the archive."""

    name = "apps.quizzes"
    label = "quizzes"
    verbose_name = _("Quizzes")
