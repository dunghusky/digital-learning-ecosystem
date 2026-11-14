from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from django.utils import timezone

from apps.villages.geocoding import (
    GeocodingError,
    NominatimGeocoder,
    Precision,
    suggest_location,
)
from apps.villages.models import CraftVillage

# Matches the model's decimal_places, so saving never rounds silently.
_SIX_DECIMALS = Decimal("0.000001")


class Command(BaseCommand):
    help = (
        "Suggest coordinates for villages that have none, using OpenStreetMap Nominatim. "
        "Check every suggestion with the map picker in the admin afterwards."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "codes",
            nargs="*",
            help="Only these village codes (default: every village without coordinates)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print the suggestions without saving them",
        )
        parser.add_argument(
            "--accept-commune",
            action="store_true",
            help="Also save commune-centre matches (low precision, may be kilometres off)",
        )

    def handle(self, *args, **options) -> None:
        villages = CraftVillage.objects.order_by("code")
        if options["codes"]:
            villages = villages.filter(code__in=options["codes"])
        else:
            villages = villages.filter(Q(latitude__isnull=True) | Q(longitude__isnull=True))

        geocoder = NominatimGeocoder(settings.GEOCODER_USER_AGENT)
        saved = skipped = not_found = 0
        for village in villages:
            try:
                suggestion = suggest_location(village, geocoder)
            except GeocodingError as exc:
                # Villages already processed keep their saved coordinates; rerunning resumes.
                raise CommandError(
                    f"{exc}\nIf other websites open fine, your DNS may not resolve "
                    "openstreetmap.org: switch the network DNS to 8.8.8.8 or 1.1.1.1 and retry."
                ) from exc
            if suggestion is None:
                not_found += 1
                self.stdout.write(self.style.WARNING(f"{village.code}: not found"))
                continue

            place = suggestion.place
            self.stdout.write(
                f"{village.code}: {place.latitude}, {place.longitude} "
                f"[{suggestion.precision}, {place.kind}] via '{suggestion.query}'\n"
                f"    {place.label}\n"
                f"    check: https://www.google.com/maps?q={place.latitude},{place.longitude}"
            )
            if options["dry_run"]:
                continue
            if suggestion.precision == Precision.COMMUNE and not options["accept_commune"]:
                skipped += 1
                continue

            village.latitude = place.latitude.quantize(_SIX_DECIMALS)
            village.longitude = place.longitude.quantize(_SIX_DECIMALS)
            # Leave a trace for editors: these coordinates still need a human check.
            note = (
                f"[{timezone.localdate():%Y-%m-%d}] Coordinates suggested by geocode_villages "
                f"({suggestion.precision} match: {place.label}). Verify on the map."
            )
            village.notes = f"{village.notes}\n{note}".strip()
            village.save(update_fields=["latitude", "longitude", "notes", "updated_at"])
            saved += 1

        summary = f"saved={saved} skipped_commune={skipped} not_found={not_found}"
        prefix = "[dry run] " if options["dry_run"] else ""
        self.stdout.write(self.style.SUCCESS(prefix + summary))
