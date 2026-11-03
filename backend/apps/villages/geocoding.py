"""Suggest coordinates for villages from their names, using OpenStreetMap Nominatim.

Suggestions are a starting point, not ground truth: an editor should check each one with the
map picker in the admin. The lookup tries the most specific names first (hamlet, village)
and only falls back to the commune centre, which is marked as a low-precision match.
"""

import json
import time
from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum
from typing import Protocol
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .models import PROVINCE_BOUNDS, CraftVillage, location_errors


@dataclass(frozen=True)
class Place:
    latitude: Decimal
    longitude: Decimal
    label: str
    #: OSM place kind such as "village", "hamlet" or "road"; helps judge the match.
    kind: str


class GeocodingError(Exception):
    """The geocoding service could not be reached or answered with an error."""


class Geocoder(Protocol):
    def search(self, query: str) -> list[Place]: ...


class NominatimGeocoder:
    """Minimal Nominatim client that follows its usage policy: an identifying User-Agent and
    at most one request per second. https://operations.osmfoundation.org/policies/nominatim/
    """

    URL = "https://nominatim.openstreetmap.org/search"
    TIMEOUT_SECONDS = 15

    def __init__(
        self,
        user_agent: str,
        *,
        min_interval: float = 1.0,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.user_agent = user_agent
        self.min_interval = min_interval
        self._sleep = sleep
        self._clock = clock
        self._last_request: float | None = None

    def search(self, query: str) -> list[Place]:
        self._throttle()
        params = {
            "q": query,
            "format": "jsonv2",
            "countrycodes": "vn",
            # Restrict results to the province; viewbox is left,top,right,bottom.
            "viewbox": ",".join(
                str(value)
                for value in (
                    PROVINCE_BOUNDS.west,
                    PROVINCE_BOUNDS.north,
                    PROVINCE_BOUNDS.east,
                    PROVINCE_BOUNDS.south,
                )
            ),
            "bounded": "1",
            "limit": "1",
            "accept-language": "vi",
        }
        request = Request(
            f"{self.URL}?{urlencode(params)}", headers={"User-Agent": self.user_agent}
        )
        try:
            with urlopen(request, timeout=self.TIMEOUT_SECONDS) as response:
                results = json.load(response)
        except (URLError, TimeoutError) as exc:
            raise GeocodingError(f"Cannot reach {self.URL}: {exc}") from exc
        return [
            Place(
                latitude=Decimal(result["lat"]),
                longitude=Decimal(result["lon"]),
                label=result.get("display_name", ""),
                kind=result.get("addresstype") or result.get("type", ""),
            )
            for result in results
        ]

    def _throttle(self) -> None:
        if self._last_request is not None:
            wait = self.min_interval - (self._clock() - self._last_request)
            if wait > 0:
                self._sleep(wait)
        self._last_request = self._clock()


class Precision(StrEnum):
    #: Matched the hamlet or village itself.
    VILLAGE = "village"
    #: Only the commune was found: the pin sits at the commune centre, maybe kilometres off.
    COMMUNE = "commune"


@dataclass(frozen=True)
class Suggestion:
    place: Place
    precision: Precision
    query: str


def place_name(village_name: str) -> str:
    """The proper-noun tail of a village name: "Làng nón lá Trà Lộc" -> "Trà Lộc".

    Village names start with lowercase descriptors (craft, "làng nghề"…), while place names
    are capitalised word by word, so the trailing capitalised words are the place.
    """
    words = village_name.split()
    tail: list[str] = []
    for word in reversed(words):
        if not word[:1].isupper():
            break
        tail.insert(0, word)
    # "Làng" itself is capitalised as the first word; never return it alone.
    tail = [word for word in tail if word.lower() not in {"làng", "lang"}] or tail
    return " ".join(tail)


def candidate_queries(village: CraftVillage) -> list[tuple[str, Precision]]:
    """Search strings from most to least specific, without duplicates."""

    def join(*parts: str) -> str:
        return ", ".join(part for part in parts if part)

    place = place_name(village.name)
    candidates = [
        (join(village.hamlet, village.commune), Precision.VILLAGE) if village.hamlet else None,
        (join(village.hamlet, village.former_commune), Precision.VILLAGE)
        if village.hamlet
        else None,
        (join(place, village.commune), Precision.VILLAGE) if place else None,
        (join(place, village.former_commune), Precision.VILLAGE) if place else None,
        (place, Precision.VILLAGE) if place else None,
        (village.commune, Precision.COMMUNE) if village.commune else None,
        (join(village.former_commune, village.former_district), Precision.COMMUNE)
        if village.former_commune
        else None,
    ]
    seen: set[str] = set()
    queries = []
    for candidate in candidates:
        if candidate and candidate[0] not in seen:
            seen.add(candidate[0])
            queries.append(candidate)
    return queries


# The bounding box also covers Hue and a corner of Ha Tinh, where many place names repeat
# (Kim Long, Gia Hoi...), so a result must also name the province in its address.
PROVINCE_NAME = "Quảng Trị"


def in_province(place: Place) -> bool:
    return PROVINCE_NAME in place.label and not location_errors(place.latitude, place.longitude)


def suggest_location(village: CraftVillage, geocoder: Geocoder) -> Suggestion | None:
    for query, precision in candidate_queries(village):
        for place in geocoder.search(query):
            if in_province(place):
                return Suggestion(place=place, precision=precision, query=query)
    return None
