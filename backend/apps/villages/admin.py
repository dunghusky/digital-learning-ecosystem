from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _

from apps.core.models import PublicationStatus

from .models import CraftVillage


class HasLocationFilter(admin.SimpleListFilter):
    """Lets editors find the villages that still need coordinates before they reach the map."""

    title = _("on map")
    parameter_name = "has_location"

    def lookups(self, request: HttpRequest, model_admin: admin.ModelAdmin):
        return [("yes", _("Has coordinates")), ("no", _("Missing coordinates"))]

    def queryset(self, request: HttpRequest, queryset: QuerySet[CraftVillage]):
        located = queryset.with_location()
        if self.value() == "yes":
            return located
        if self.value() == "no":
            return queryset.exclude(pk__in=located.values("pk"))
        return queryset


@admin.register(CraftVillage)
class CraftVillageAdmin(admin.ModelAdmin):
    list_display = ["name", "craft_type", "commune", "former_region", "status", "has_location"]
    list_filter = ["status", HasLocationFilter, "craft_type", "former_region", "recognition_status"]
    search_fields = ["name", "code", "commune", "former_commune", "main_products"]
    prepopulated_fields = {"code": ["name"]}
    readonly_fields = ["created_at", "updated_at", "published_at"]
    list_per_page = 50
    actions = ["publish_villages", "unpublish_villages"]
    fieldsets = [
        (None, {"fields": ["code", "name", "craft_type", "main_products", "short_description"]}),
        (
            _("Recognition"),
            {"fields": ["recognition_status", "recognition_decision", "recognition_year"]},
        ),
        (
            _("Location"),
            {
                "description": _(
                    "To get coordinates, right-click the village on Google Maps and click the "
                    "numbers at the top of the menu to copy them, e.g. 16.712300, 107.245600. "
                    "The first number is the latitude, the second the longitude."
                ),
                "fields": [
                    "former_region",
                    "hamlet",
                    "commune",
                    "former_commune",
                    "former_district",
                    "latitude",
                    "longitude",
                ],
            },
        ),
        (
            _("Content"),
            {
                "fields": [
                    "history",
                    "production_process",
                    "current_situation",
                    "culture",
                    "visitor_info",
                    "contact",
                ]
            },
        ),
        (_("Editorial"), {"fields": ["status", "sources", "notes"]}),
        (
            _("Timestamps"),
            {"fields": ["published_at", "created_at", "updated_at"], "classes": ["collapse"]},
        ),
    ]

    @admin.display(boolean=True, description=_("on map"))
    def has_location(self, obj: CraftVillage) -> bool:
        return obj.has_location

    def _set_status(self, queryset: QuerySet[CraftVillage], status: str) -> int:
        """Save row by row so published_at is stamped on first publication."""
        changed = 0
        for village in queryset.exclude(status=status):
            village.status = status
            village.save(update_fields=["status", "published_at", "updated_at"])
            changed += 1
        return changed

    @admin.action(description=_("Publish selected villages"))
    def publish_villages(self, request: HttpRequest, queryset: QuerySet[CraftVillage]) -> None:
        changed = self._set_status(queryset, PublicationStatus.PUBLISHED)
        self.message_user(request, _("Published %(count)d village(s).") % {"count": changed})

    @admin.action(description=_("Move selected villages back to draft"))
    def unpublish_villages(self, request: HttpRequest, queryset: QuerySet[CraftVillage]) -> None:
        changed = self._set_status(queryset, PublicationStatus.DRAFT)
        self.message_user(
            request, _("Moved %(count)d village(s) back to draft.") % {"count": changed}
        )
