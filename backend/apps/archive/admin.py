from django.contrib import admin
from django.db.models import Count, QuerySet
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _

from apps.core.admin import PublishableAdminMixin

from .models import Document, GlossaryTerm, Theme


class GlossaryTermInline(admin.TabularInline):
    model = GlossaryTerm
    fields = ["term", "explanation"]
    extra = 1


@admin.register(Theme)
class ThemeAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "document_count"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}

    def get_queryset(self, request: HttpRequest) -> QuerySet[Theme]:
        return super().get_queryset(request).annotate(document_count=Count("documents"))

    @admin.display(description=_("documents"), ordering="document_count")
    def document_count(self, obj: Theme) -> int:
        return obj.document_count


@admin.register(Document)
class DocumentAdmin(PublishableAdminMixin, admin.ModelAdmin):
    list_display = ["title", "genre", "grade_level", "license", "status", "village_list"]
    list_filter = ["status", "genre", "grade_level", "license", "villages", "themes"]
    search_fields = ["title", "slug", "body", "source", "collector"]
    prepopulated_fields = {"slug": ["title"]}
    autocomplete_fields = ["villages", "themes"]
    readonly_fields = ["created_at", "updated_at", "published_at"]
    inlines = [GlossaryTermInline]
    list_per_page = 50
    fieldsets = [
        (None, {"fields": ["slug", "title", "genre", "body", "summary", "answer"]}),
        (_("Links"), {"fields": ["villages", "themes"]}),
        (_("Teaching"), {"fields": ["grade_level", "reading_questions"]}),
        (
            _("Source and license"),
            {
                "description": _(
                    "Folk works must cite the book or person they were collected from. A "
                    "document with an unknown license stays a draft."
                ),
                "fields": [
                    "author",
                    "collector",
                    "source",
                    "source_url",
                    "license",
                    "permission_note",
                ],
            },
        ),
        (_("Editorial"), {"fields": ["status", "notes"]}),
        (
            _("Timestamps"),
            {"fields": ["published_at", "created_at", "updated_at"], "classes": ["collapse"]},
        ),
    ]

    def get_queryset(self, request: HttpRequest) -> QuerySet[Document]:
        return super().get_queryset(request).prefetch_related("villages")

    @admin.display(description=_("craft villages"))
    def village_list(self, obj: Document) -> str:
        return ", ".join(village.name for village in obj.villages.all())
