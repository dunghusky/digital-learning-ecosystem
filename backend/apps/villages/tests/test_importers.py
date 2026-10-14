from pathlib import Path

import pytest
from openpyxl import Workbook

from apps.villages.importers import import_villages
from apps.villages.models import CraftType, CraftVillage, FormerRegion, RecognitionStatus

pytestmark = pytest.mark.django_db

COLUMNS = [
    "code",
    "name",
    "craft_type",
    "main_products",
    "recognition_status",
    "former_region",
    "commune_new",
    "commune_old",
    "latitude",
    "longitude",
    "short_description",
]


def build_workbook(path: Path, rows: list[list]) -> Path:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Villages"
    sheet.append(["Vietnamese label"] * len(COLUMNS))
    sheet.append(COLUMNS)
    for row in rows:
        sheet.append(row)
    workbook.save(path)
    return path


def test_import_creates_and_updates_villages(tmp_path):
    path = build_workbook(
        tmp_path / "villages.xlsx",
        [
            [
                "tra-loc",
                "Lang non la Tra Loc",
                "Nón lá",
                "Non la",
                "Làng nghề truyền thống",
                "Quảng Trị cũ",
                "Xa Hai Lang",
                "Hai Xuan",
                16.7123,
                107.2456,
                "Lang nghe non la lau doi",
            ]
        ],
    )

    report = import_villages(path)

    assert (report.created, report.updated, report.errors) == (1, 0, [])
    village = CraftVillage.objects.get(code="tra-loc")
    assert village.craft_type == CraftType.CONICAL_HAT
    assert village.former_region == FormerRegion.QUANG_TRI
    assert village.recognition_status == RecognitionStatus.TRADITIONAL_VILLAGE
    assert village.commune == "Xa Hai Lang"
    assert village.former_commune == "Hai Xuan"
    assert (float(village.latitude), float(village.longitude)) == (16.7123, 107.2456)

    # Re-importing the same code refreshes the row instead of duplicating it.
    report = import_villages(path)
    assert (report.created, report.updated) == (0, 1)
    assert CraftVillage.objects.count() == 1


def test_publish_flag_publishes_imported_villages(tmp_path):
    rows = [
        [
            "tra-loc",
            "Lang non la Tra Loc",
            "Nón lá",
            "Non la",
            "",
            "Quảng Trị cũ",
            "",
            "",
            "",
            "",
            "",
        ]
    ]
    path = build_workbook(tmp_path / "villages.xlsx", rows)

    import_villages(path, publish=True)

    village = CraftVillage.objects.get(code="tra-loc")
    assert village.is_published
    assert village.published_at is not None


def test_import_without_publish_flag_leaves_the_editorial_status_alone(tmp_path):
    """Re-importing must never unpublish a village an editor already reviewed."""
    rows = [
        [
            "tra-loc",
            "Lang non la Tra Loc",
            "Nón lá",
            "Non la",
            "",
            "Quảng Trị cũ",
            "",
            "",
            "",
            "",
            "",
        ]
    ]
    path = build_workbook(tmp_path / "villages.xlsx", rows)
    import_villages(path, publish=True)

    import_villages(path)

    assert CraftVillage.objects.get(code="tra-loc").is_published


def test_import_reports_unknown_labels_and_skips_the_row(tmp_path):
    path = build_workbook(
        tmp_path / "villages.xlsx",
        [["x-village", "Village X", "Nghe la", "Products", "", "Quảng Trị cũ", "", "", "", "", ""]],
    )

    report = import_villages(path)

    assert report.created == 0
    assert report.skipped == 1
    assert "unknown craft_type" in report.errors[0]
    assert not CraftVillage.objects.exists()


def test_dry_run_writes_nothing(tmp_path):
    path = build_workbook(
        tmp_path / "villages.xlsx",
        [
            [
                "tra-loc",
                "Lang non la Tra Loc",
                "Nón lá",
                "Non la",
                "",
                "Quảng Trị cũ",
                "",
                "",
                "",
                "",
                "",
            ]
        ],
    )

    report = import_villages(path, dry_run=True)

    assert report.created == 1
    assert not CraftVillage.objects.exists()


def test_import_rejects_a_workbook_without_the_villages_sheet(tmp_path):
    workbook = Workbook()
    workbook.active.title = "Other"
    path = tmp_path / "wrong.xlsx"
    workbook.save(path)

    with pytest.raises(ValueError, match="no 'Villages' sheet"):
        import_villages(path)
