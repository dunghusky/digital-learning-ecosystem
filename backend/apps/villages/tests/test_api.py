import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.models import PublicationStatus
from apps.villages.models import CraftType, FormerRegion

from .factories import create_village

pytestmark = pytest.mark.django_db


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def test_list_returns_only_published_villages(client):
    create_village("tra-loc")
    create_village("draft-village", status=PublicationStatus.DRAFT)

    response = client.get(reverse("village-list"))

    assert response.status_code == 200
    codes = [village["code"] for village in response.json()["results"]]
    assert codes == ["tra-loc"]


def test_list_is_public(client):
    """Anonymous visitors must reach the catalogue even though the API defaults to auth."""
    assert client.get(reverse("village-list")).status_code == 200


def test_detail_is_looked_up_by_code(client):
    create_village("my-thuy", name="Lang nuoc mam My Thuy")

    response = client.get(reverse("village-detail", kwargs={"code": "my-thuy"}))

    assert response.status_code == 200
    assert response.json()["name"] == "Lang nuoc mam My Thuy"


def test_detail_hides_unpublished_villages(client):
    create_village("my-thuy", status=PublicationStatus.PENDING)

    response = client.get(reverse("village-detail", kwargs={"code": "my-thuy"}))

    assert response.status_code == 404


def test_can_filter_by_craft_type_and_region(client):
    create_village("tra-loc")
    create_village(
        "canh-duong",
        craft_type=CraftType.FISH_SAUCE,
        former_region=FormerRegion.QUANG_BINH,
    )

    response = client.get(reverse("village-list"), {"craft_type": CraftType.FISH_SAUCE.value})

    assert [v["code"] for v in response.json()["results"]] == ["canh-duong"]


def test_can_search_by_name(client):
    create_village("tra-loc", name="Lang non la Tra Loc")
    create_village("kim-long", name="Lang ruou Kim Long")

    response = client.get(reverse("village-list"), {"search": "ruou"})

    assert [v["code"] for v in response.json()["results"]] == ["kim-long"]
