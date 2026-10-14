from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

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


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (None, None),
        (Decimal("16.7123"), Decimal("107.2456")),
        (Decimal("17.75"), Decimal("106.42")),
    ],
    ids=["no-location", "former-quang-tri", "former-quang-binh"],
)
def test_clean_accepts_blank_or_in_province_coordinates(latitude, longitude):
    create_village(latitude=latitude, longitude=longitude).full_clean()


def test_clean_requires_both_coordinates():
    village = create_village(latitude=Decimal("16.7123"))

    with pytest.raises(ValidationError) as error:
        village.full_clean()

    assert "longitude" in error.value.message_dict


def test_clean_rejects_swapped_coordinates():
    village = create_village(latitude=Decimal("107.2456"), longitude=Decimal("16.7123"))

    with pytest.raises(ValidationError) as error:
        village.full_clean()

    assert "latitude" in error.value.message_dict
