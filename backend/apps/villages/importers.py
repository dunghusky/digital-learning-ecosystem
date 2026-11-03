"""Import craft villages from the data-collection workbook (docs/data/craft-villages.xlsx).

Sheet layout: row 1 holds Vietnamese labels for humans, row 2 holds the field keys used
here, and the data starts on row 3. Villages are matched by ``code``, so re-importing an
updated workbook refreshes the existing rows instead of duplicating them.
"""

from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from django.db import transaction

from apps.core.importing import ImportReport, clean_text, read_sheet
from apps.core.models import PublicationStatus

from .models import CraftType, CraftVillage, FormerRegion, RecognitionStatus, location_errors

SHEET_NAME = "Villages"
KEY_ROW = 2

# The workbook is filled in Vietnamese; map those labels onto the stored choice values.
CRAFT_TYPE_BY_LABEL = {
    "nón lá": CraftType.CONICAL_HAT,
    "nước mắm": CraftType.FISH_SAUCE,
    "dệt chiếu": CraftType.MAT_WEAVING,
    "mây tre đan": CraftType.BAMBOO_RATTAN,
    "mộc - chạm khắc": CraftType.WOODWORK,
    "rượu": CraftType.RICE_WINE,
    "bún - bánh": CraftType.NOODLES_CAKES,
    "rèn - đúc": CraftType.METALWORK,
    "quạt giấy": CraftType.PAPER_FAN,
    "chổi đót": CraftType.BROOM,
    "thực phẩm - đặc sản khác": CraftType.FOOD_SPECIALTY,
    "khác": CraftType.OTHER,
}
RECOGNITION_BY_LABEL = {
    "làng nghề truyền thống": RecognitionStatus.TRADITIONAL_VILLAGE,
    "làng nghề": RecognitionStatus.VILLAGE,
    "nghề truyền thống": RecognitionStatus.TRADITIONAL_CRAFT,
    "chưa công nhận": RecognitionStatus.NOT_RECOGNIZED,
    "chưa rõ": RecognitionStatus.UNKNOWN,
}
REGION_BY_LABEL = {
    "quảng trị cũ": FormerRegion.QUANG_TRI,
    "quảng bình cũ": FormerRegion.QUANG_BINH,
}

# Workbook field key -> model field name (only where the two differ).
FIELD_ALIASES = {
    "commune_new": "commune",
    "commune_old": "former_commune",
    "district_old": "former_district",
    "current_status": "current_situation",
}
TEXT_FIELDS = [
    "name",
    "main_products",
    "recognition_decision",
    "hamlet",
    "commune",
    "former_commune",
    "former_district",
    "short_description",
    "history",
    "production_process",
    "current_situation",
    "culture",
    "visitor_info",
    "contact",
    "sources",
    "notes",
]
REQUIRED_FIELDS = ["code", "name", "craft_type", "former_region"]


def _choice(value: Any, mapping: dict[str, Any], row: int, column: str, report: ImportReport):
    label = clean_text(value).lower()
    if not label:
        return None
    if label not in mapping:
        report.errors.append(f"Row {row}: unknown {column} '{clean_text(value)}'")
        return None
    return mapping[label]


def _decimal(value: Any, row: int, column: str, report: ImportReport) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value).strip().replace(",", "."))
    except (InvalidOperation, ValueError):
        report.errors.append(f"Row {row}: invalid {column} '{value}'")
        return None


def _year(value: Any, row: int, report: ImportReport) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(str(value).strip()))
    except ValueError:
        report.errors.append(f"Row {row}: invalid recognition_year '{value}'")
        return None


def import_villages(path: Path, *, dry_run: bool = False, publish: bool = False) -> ImportReport:
    report = ImportReport()
    rows = read_sheet(
        path, SHEET_NAME, key_row=KEY_ROW, required=REQUIRED_FIELDS, aliases=FIELD_ALIASES
    )

    with transaction.atomic():
        for row_number, raw in rows:
            code = clean_text(raw.get("code"))
            if not code:
                continue

            craft_type = _choice(
                raw.get("craft_type"), CRAFT_TYPE_BY_LABEL, row_number, "craft_type", report
            )
            region = _choice(
                raw.get("former_region"), REGION_BY_LABEL, row_number, "former_region", report
            )
            name = clean_text(raw.get("name"))
            if not (name and craft_type and region):
                report.skipped += 1
                if name and (craft_type is None or region is None):
                    continue
                report.errors.append(f"Row {row_number}: missing name, craft type or region")
                continue

            latitude = _decimal(raw.get("latitude"), row_number, "latitude", report)
            longitude = _decimal(raw.get("longitude"), row_number, "longitude", report)
            if errors := location_errors(latitude, longitude):
                # Import the village anyway, just off the map, so one bad cell does not
                # hold back the rest of the row.
                report.errors.extend(f"Row {row_number}: {msg}" for msg in errors.values())
                latitude = longitude = None

            values = {f: clean_text(raw.get(f)) for f in TEXT_FIELDS}
            values.update(
                craft_type=craft_type,
                former_region=region,
                recognition_status=_choice(
                    raw.get("recognition_status"),
                    RECOGNITION_BY_LABEL,
                    row_number,
                    "recognition_status",
                    report,
                )
                or RecognitionStatus.UNKNOWN,
                recognition_year=_year(raw.get("recognition_year"), row_number, report),
            )
            if latitude is not None:
                # Blank coordinate cells keep what the database has: coordinates are usually
                # placed later with the admin map picker or geocode_villages, not in the sheet.
                values.update(latitude=latitude, longitude=longitude)
            if publish:
                # Without --publish the editorial status is left untouched, so re-importing
                # never unpublishes a village an editor already reviewed.
                values["status"] = PublicationStatus.PUBLISHED

            _, created = CraftVillage.objects.update_or_create(code=code, defaults=values)
            if created:
                report.created += 1
            else:
                report.updated += 1

        if dry_run:
            transaction.set_rollback(True)

    return report
