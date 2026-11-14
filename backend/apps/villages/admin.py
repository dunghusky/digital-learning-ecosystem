from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from apps.core.admin import PublishableAdminMixin

from .models import CraftVillage

LEAFLET_VERSION = "1.9.4"
LEAFLET_CDN = f"https://unpkg.com/leaflet@{LEAFLET_VERSION}/dist"


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
class CraftVillageAdmin(PublishableAdminMixin, admin.ModelAdmin):
    list_display = ["name", "craft_type", "commune", "former_region", "status", "has_location"]
    list_filter = ["status", HasLocationFilter, "craft_type", "former_region", "recognition_status"]
    search_fields = ["name", "code", "commune", "former_commune", "main_products"]
    prepopulated_fields = {"code": ["name"]}
    readonly_fields = ["location_picker", "created_at", "updated_at", "published_at"]
    list_per_page = 50
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
                    "Place the village with the map below; the coordinates are filled in for "
                    "you. Villages without coordinates are listed on the public map as not yet "
                    "located."
                ),
                "fields": [
                    "former_region",
                    "hamlet",
                    "commune",
                    "former_commune",
                    "former_district",
                    "latitude",
                    "longitude",
                    "location_picker",
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

    class Media:
        css = {"all": [f"{LEAFLET_CDN}/leaflet.css", "villages/admin/location-picker.css"]}
        js = [f"{LEAFLET_CDN}/leaflet.js", "villages/admin/location-picker.js"]

    @admin.display(description=_("pick on map"))
    def location_picker(self, obj: CraftVillage | None) -> str:
        """Interactive map that fills in the latitude and longitude inputs above it.

        Rendered as a read-only field so it sits inside the Location fieldset without being a
        form field itself; location-picker.js wires it to the real inputs.
        """
        # Pre-fill the search with what usually finds the village: its name and commune.
        query = ", ".join(filter(None, [obj.name, obj.commune])) if obj else ""
        return format_html(
            '<div class="location-picker"'
            ' data-lat-input="id_latitude" data-lng-input="id_longitude"'
            ' data-label-streets="{}" data-label-satellite="{}" data-label-searching="{}"'
            ' data-label-no-results="{}" data-label-search-failed="{}">'
            '<div class="location-picker__toolbar">'
            '<input type="search" class="location-picker__query vTextField" value="{}"'
            ' placeholder="{}" aria-label="{}">'
            '<button type="button" class="location-picker__search button">{}</button>'
            "</div>"
            '<ul class="location-picker__results" aria-live="polite"></ul>'
            '<div class="location-picker__map"></div>'
            '<p class="location-picker__help">{}</p>'
            "</div>",
            _("Map"),
            _("Satellite"),
            _("Searching…"),
            _("No place found inside the province. Try the commune name only."),
            _("Search is unavailable right now. Click the map instead."),
            query,
            _("Village, hamlet or commune name"),
            _("Search for a place"),
            _("Search"),
            _(
                "Search for the village, then click the map or drag the pin to the exact spot. "
                "Switch to Satellite to see the houses. Remember to save."
            ),
        )

    @admin.display(boolean=True, description=_("on map"))
    def has_location(self, obj: CraftVillage) -> bool:
        return obj.has_location
