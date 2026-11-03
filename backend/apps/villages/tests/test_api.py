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


def test_map_returns_geojson_with_numeric_lon_lat(client):
    create_village("tra-loc", latitude="16.712300", longitude="107.245600")

    response = client.get(reverse("village-map"))

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    [feature] = body["features"]
    assert feature["id"] == "tra-loc"
    assert feature["geometry"] == {"type": "Point", "coordinates": [107.2456, 16.7123]}
    assert feature["properties"]["craft_type"] == CraftType.CONICAL_HAT


def test_map_keeps_unlocated_villages_with_null_geometry(client):
    """The map lists villages that still need coordinates, so they must not be dropped."""
    create_village("my-thuy")

    [feature] = client.get(reverse("village-map")).json()["features"]

    assert feature["geometry"] is None


def test_map_hides_unpublished_villages(client):
    create_village("tra-loc", latitude="16.7123", longitude="107.2456")
    create_village("draft-village", status=PublicationStatus.DRAFT)

    features = client.get(reverse("village-map")).json()["features"]

    assert [f["id"] for f in features] == ["tra-loc"]


def test_map_is_not_paginated(client):
    for index in range(25):  # more than PAGE_SIZE
        create_village(f"village-{index:02d}")

    assert len(client.get(reverse("village-map")).json()["features"]) == 25


def test_map_accepts_list_filters(client):
    create_village("tra-loc")
    create_village("canh-duong", craft_type=CraftType.FISH_SAUCE)

    response = client.get(reverse("village-map"), {"craft_type": CraftType.FISH_SAUCE.value})

    assert [f["id"] for f in response.json()["features"]] == ["canh-duong"]


def test_search_ignores_diacritics(client):
    create_village("my-thuy", name="Làng nước mắm Mỹ Thủy")
    create_village("tra-loc", name="Làng nón lá Trà Lộc")

    response = client.get(reverse("village-list"), {"search": "nuoc mam"})

    assert [village["code"] for village in response.json()["results"]] == ["my-thuy"]
