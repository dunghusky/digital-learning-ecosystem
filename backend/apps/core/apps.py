from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Shared building blocks: health check and base models/utilities used by other apps."""

    name = "apps.core"
    label = "core"
