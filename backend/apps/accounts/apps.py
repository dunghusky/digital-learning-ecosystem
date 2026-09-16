from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AccountsConfig(AppConfig):
    """User accounts, roles and authentication."""

    name = "apps.accounts"
    label = "accounts"
    verbose_name = _("Accounts")
