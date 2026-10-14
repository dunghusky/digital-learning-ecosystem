import pytest

from apps.core.models import PublicationStatus
from apps.villages.models import CraftVillage

from .factories import create_village

pytestmark = pytest.mark.django_db


def test_published_at_is_stamped_once():
    village = create_village(status=PublicationStatus.DRAFT)
    assert village.published_at is None

    village.status = PublicationStatus.PUBLISHED
    village.save()
    first_published_at = village.published_at
    assert first_published_at is not None

    village.name = "Renamed"
    village.save()
    assert village.published_at == first_published_at


def test_published_queryset_filters_by_status():
    create_village("tra-loc")
    create_village("draft-village", status=PublicationStatus.DRAFT)

    assert [v.code for v in CraftVillage.objects.published()] == ["tra-loc"]


def test_has_location_requires_both_coordinates():
    village = create_village(latitude="16.712300")
    assert village.has_location is False

    village.longitude = "107.245600"
    assert village.has_location is True
