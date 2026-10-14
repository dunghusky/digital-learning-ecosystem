from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class VillagesConfig(AppConfig):
    """Craft villages: the core catalogue every other module links to."""

    name = "apps.villages"
    label = "villages"
    verbose_name = _("Craft villages")
