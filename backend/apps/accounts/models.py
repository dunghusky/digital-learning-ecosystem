from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom user model, declared from day one so roles, schools and classes can be
    added later without swapping AUTH_USER_MODEL (which is very hard to do afterwards)."""

    class Meta(AbstractUser.Meta):
        verbose_name = _("user")
        verbose_name_plural = _("users")
