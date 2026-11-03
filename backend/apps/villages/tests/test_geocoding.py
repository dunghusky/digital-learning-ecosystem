import io
import json
from decimal import Decimal

import pytest
from django.core.management import CommandError, call_command

from apps.core.models import PublicationStatus
from apps.villages import geocoding
from apps.villages.geocoding import (
    NominatimGeocoder,
    Place,
    Precision,
    candidate_queries,
    place_name,
    suggest_location,
)
from apps.villages.models import CraftVillage

from .factories import create_village

pytestmark = pytest.mark.django_db

TRA_LOC = Place(
    Decimal("16.712345678"),
    Decimal("107.245678901"),
    "Trà Lộc, Hải Lăng, Tỉnh Quảng Trị",
    "village",
)
HAI_LANG = Place(Decimal("16.70"), Decimal("107.25"), "Xã Hải Lăng, Tỉnh Quảng Trị", "municipality")
HUE = Place(Decimal("16.46"), Decimal("107.55"), "Phường Kim Long, Thành phố Huế", "suburb")
OUTSIDE = Place(Decimal("21.03"), Decimal("105.85"), "Hà Nội", "city")


class FakeGeocoder:
    """Answers from a fixed table and records the queries it was asked."""

    def __init__(self, answers: dict[str, list[Place]]) -> None:
        self.answers = answers
        self.queries: list[str] = []

    def search(self, query: str) -> list[Place]:
        self.queries.append(query)
        return self.answers.get(query, [])


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Làng nón lá Trà Lộc", "Trà Lộc"),
        ("Làng nước mắm Mỹ Thủy", "Mỹ Thủy"),
        ("Làng Bố Liêu", "Bố Liêu"),
        ("Bố Liêu", "Bố Liêu"),
    ],
)
def test_place_name_keeps_the_capitalised_tail(name, expected):
    assert place_name(name) == expected


def test_candidate_queries_go_from_village_to_commune():
    village = create_village(name="Làng nón lá Trà Lộc", commune="Xã Hải Lăng")

    assert candidate_queries(village) == [
        ("Trà Lộc, Xã Hải Lăng", Precision.VILLAGE),
        ("Trà Lộc", Precision.VILLAGE),
        ("Xã Hải Lăng", Precision.COMMUNE),
    ]


def test_suggestion_prefers_the_village_match():
    village = create_village(name="Làng nón lá Trà Lộc", commune="Xã Hải Lăng")
    geocoder = FakeGeocoder({"Trà Lộc": [TRA_LOC], "Xã Hải Lăng": [HAI_LANG]})

    suggestion = suggest_location(village, geocoder)

    assert suggestion.place == TRA_LOC
    assert suggestion.precision == Precision.VILLAGE
    assert geocoder.queries == ["Trà Lộc, Xã Hải Lăng", "Trà Lộc"]


def test_suggestion_ignores_results_outside_the_province():
    village = create_village(name="Làng nón lá Trà Lộc", commune="Xã Hải Lăng")
    geocoder = FakeGeocoder({"Trà Lộc": [OUTSIDE], "Xã Hải Lăng": [HAI_LANG]})

    suggestion = suggest_location(village, geocoder)

    assert suggestion.place == HAI_LANG
    assert suggestion.precision == Precision.COMMUNE


def test_suggestion_ignores_namesakes_in_hue_inside_the_bounding_box():
    village = create_village(name="Làng nón lá Trà Lộc", commune="Xã Hải Lăng")
    geocoder = FakeGeocoder({"Trà Lộc": [HUE], "Xã Hải Lăng": [HAI_LANG]})

    assert suggest_location(village, geocoder).place == HAI_LANG


def test_nominatim_waits_between_requests(monkeypatch):
    monkeypatch.setattr(geocoding, "urlopen", lambda *a, **kw: io.BytesIO(json.dumps([]).encode()))
    sleeps: list[float] = []
    # First request stamps 100.0; the second starts 0.25 s later, then stamps after waiting.
    now = iter([100.0, 100.25, 101.0])
    geocoder = NominatimGeocoder("test-agent", sleep=sleeps.append, clock=lambda: next(now))

    geocoder.search("Trà Lộc")
    geocoder.search("Mỹ Thủy")

    assert sleeps == [pytest.approx(0.75)]


@pytest.fixture
def fake_nominatim(monkeypatch):
    geocoder = FakeGeocoder({"Trà Lộc": [TRA_LOC], "Xã Hải Lăng": [HAI_LANG]})
    monkeypatch.setattr(
        "apps.villages.management.commands.geocode_villages.NominatimGeocoder",
        lambda user_agent: geocoder,
    )
    return geocoder


def test_command_saves_village_matches_and_leaves_a_note(fake_nominatim):
    create_village("tra-loc", name="Làng nón lá Trà Lộc", status=PublicationStatus.DRAFT)

    call_command("geocode_villages", stdout=io.StringIO())

    village = CraftVillage.objects.get(code="tra-loc")
    assert (village.latitude, village.longitude) == (Decimal("16.712346"), Decimal("107.245679"))
    assert "geocode_villages" in village.notes
    assert village.status == PublicationStatus.DRAFT  # editorial status untouched


def test_command_skips_commune_matches_unless_accepted(fake_nominatim):
    create_village("hai-lang", name="Làng rượu Kim Long", commune="Xã Hải Lăng")

    call_command("geocode_villages", stdout=io.StringIO())
    assert CraftVillage.objects.get(code="hai-lang").latitude is None

    call_command("geocode_villages", "--accept-commune", stdout=io.StringIO())
    assert CraftVillage.objects.get(code="hai-lang").latitude == Decimal("16.700000")


def test_command_dry_run_saves_nothing_and_skips_located_villages(fake_nominatim):
    create_village("tra-loc", name="Làng nón lá Trà Lộc")
    create_village("my-thuy", latitude="16.80", longitude="107.10")

    call_command("geocode_villages", "--dry-run", stdout=io.StringIO())

    assert CraftVillage.objects.get(code="tra-loc").latitude is None
    assert fake_nominatim.queries == ["Trà Lộc"]  # the located village was never looked up


def test_unreachable_service_stops_the_command_with_a_hint(monkeypatch):
    def offline(*args, **kwargs):
        raise geocoding.URLError("getaddrinfo failed")

    monkeypatch.setattr(geocoding, "urlopen", offline)
    create_village("tra-loc", name="Làng nón lá Trà Lộc")

    with pytest.raises(CommandError, match="8.8.8.8"):
        call_command("geocode_villages", stdout=io.StringIO())
