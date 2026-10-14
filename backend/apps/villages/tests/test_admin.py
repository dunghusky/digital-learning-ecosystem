import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from apps.core.models import PublicationStatus
from apps.villages.admin import CraftVillageAdmin
from apps.villages.models import CraftVillage

from .factories import create_village

pytestmark = pytest.mark.django_db


@pytest.fixture
def village_admin() -> CraftVillageAdmin:
    return CraftVillageAdmin(CraftVillage, AdminSite())


@pytest.fixture
def request_with_messages(rf: RequestFactory, django_user_model):
    """The admin actions report their result through the message framework."""
    request = rf.post("/admin/villages/craftvillage/")
    request.user = django_user_model.objects.create_superuser("editor", password="pw")
    request._messages = type("Storage", (), {"add": lambda self, *args, **kwargs: None})()
    return request


def test_publish_action_publishes_drafts(village_admin, request_with_messages):
    create_village("tra-loc", status=PublicationStatus.DRAFT)
    create_village("my-thuy", status=PublicationStatus.PENDING)

    village_admin.publish_villages(request_with_messages, CraftVillage.objects.all())

    assert CraftVillage.objects.published().count() == 2
    assert all(v.published_at is not None for v in CraftVillage.objects.all())


def test_publish_action_keeps_the_original_publication_date(village_admin, request_with_messages):
    village = create_village("tra-loc")
    first_published_at = village.published_at

    village_admin.publish_villages(request_with_messages, CraftVillage.objects.all())

    village.refresh_from_db()
    assert village.published_at == first_published_at


def test_unpublish_action_moves_villages_back_to_draft(village_admin, request_with_messages):
    create_village("tra-loc")

    village_admin.unpublish_villages(request_with_messages, CraftVillage.objects.all())

    assert CraftVillage.objects.published().count() == 0
    assert CraftVillage.objects.get(code="tra-loc").status == PublicationStatus.DRAFT
