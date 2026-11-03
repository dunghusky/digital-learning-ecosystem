from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _

from .models import PublicationStatus, PublishableModel


class PublishableAdminMixin:
    """Bulk publish / unpublish actions for any admin of a ``PublishableModel``.

    Rows are saved one by one so ``published_at`` is stamped on first publication, and each row
    is validated with the model's ``clean()`` first: a bulk action must not publish what the
    change form would refuse (e.g. a document without a license).
    """

    actions = ["publish_selected", "unpublish_selected"]

    def _set_status(
        self, queryset: QuerySet[PublishableModel], status: str
    ) -> tuple[int, list[str]]:
        changed, rejected = 0, []
        for obj in queryset.exclude(status=status):
            obj.status = status
            try:
                obj.clean()
            except ValidationError as error:
                rejected.append(f"{obj}: {'; '.join(error.messages)}")
                continue
            obj.save(update_fields=["status", "published_at", "updated_at"])
            changed += 1
        return changed, rejected

    def _report(self, request: HttpRequest, message: str, rejected: list[str]) -> None:
        self.message_user(request, message)
        for line in rejected:
            self.message_user(request, _("Skipped %(row)s") % {"row": line}, messages.WARNING)

    @admin.action(description=_("Publish selected items"))
    def publish_selected(self, request: HttpRequest, queryset: QuerySet) -> None:
        changed, rejected = self._set_status(queryset, PublicationStatus.PUBLISHED)
        self._report(request, _("Published %(count)d item(s).") % {"count": changed}, rejected)

    @admin.action(description=_("Move selected items back to draft"))
    def unpublish_selected(self, request: HttpRequest, queryset: QuerySet) -> None:
        changed, rejected = self._set_status(queryset, PublicationStatus.DRAFT)
        self._report(
            request, _("Moved %(count)d item(s) back to draft.") % {"count": changed}, rejected
        )
