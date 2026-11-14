from pathlib import Path

import pytest
from openpyxl import Workbook

from apps.archive.importers import import_documents
from apps.archive.models import Document, Genre
from apps.core.models import PublicationStatus
from apps.villages.tests.factories import create_village

pytestmark = pytest.mark.django_db

COLUMNS = [
    "slug",
    "title",
    "genre",
    "body",
    "villages",
    "themes",
    "grade_level",
    "source",
    "license",
    "glossary",
]


def row(slug: str = "ai-ve-bo-lieu", **overrides) -> list:
    values = {
        "slug": slug,
        "title": "Ai ve Bo Lieu",
        "genre": "folk_verse",
        "body": "Ai ve Bo Lieu\nMua non la",
        "villages": "tra-loc",
        "themes": "que-huong, lao-dong",
        "grade_level": "all",
        "source": "Dia chi Quang Tri",
        "license": "folk_attributed",
        "glossary": "ma: me\nrua: giua",
    }
    return [(values | overrides)[column] for column in COLUMNS]


def build_workbook(path: Path, rows: list[list]) -> Path:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Documents"
    sheet.append(COLUMNS)
    for values in rows:
        sheet.append(values)
    workbook.save(path)
    return path


def test_import_creates_document_with_links_and_glossary(tmp_path):
    create_village("tra-loc")
    path = build_workbook(tmp_path / "documents.xlsx", [row()])

    report = import_documents(path)

    assert (report.created, report.errors) == (1, [])
    document = Document.objects.get(slug="ai-ve-bo-lieu")
    assert document.status == PublicationStatus.DRAFT
    assert [v.code for v in document.villages.all()] == ["tra-loc"]
    assert sorted(t.slug for t in document.themes.all()) == ["lao-dong", "que-huong"]
    assert {g.term: g.explanation for g in document.glossary.all()} == {"ma": "me", "rua": "giua"}


def test_reimport_updates_and_replaces_glossary(tmp_path):
    create_village("tra-loc")
    import_documents(build_workbook(tmp_path / "a.xlsx", [row()]))

    report = import_documents(
        build_workbook(tmp_path / "b.xlsx", [row(title="Renamed", glossary="non: cai non")])
    )

    assert (report.created, report.updated) == (0, 1)
    document = Document.objects.get(slug="ai-ve-bo-lieu")
    assert document.title == "Renamed"
    assert [g.term for g in document.glossary.all()] == ["non"]


def test_publish_flag_keeps_unlicensed_rows_as_drafts(tmp_path):
    path = build_workbook(
        tmp_path / "documents.xlsx",
        [row("licensed", villages=""), row("unlicensed", villages="", license="unknown")],
    )

    import_documents(path, publish=True)

    assert [d.slug for d in Document.objects.published()] == ["licensed"]
    assert Document.objects.get(slug="unlicensed").status == PublicationStatus.DRAFT


def test_folk_row_without_source_is_skipped(tmp_path):
    path = build_workbook(tmp_path / "documents.xlsx", [row(villages="", source="")])

    report = import_documents(path)

    assert report.skipped == 1
    assert "Row 2" in report.errors[0]
    assert not Document.objects.exists()


def test_unknown_choice_and_village_are_reported(tmp_path):
    path = build_workbook(
        tmp_path / "documents.xlsx",
        [row("bad-genre", genre="song", villages=""), row("good", villages="nowhere")],
    )

    report = import_documents(path)

    assert report.created == 1
    assert any("unknown genre 'song'" in error for error in report.errors)
    assert any("unknown village code 'nowhere'" in error for error in report.errors)


def test_riddle_answer_is_moved_out_of_the_body(tmp_path):
    path = build_workbook(
        tmp_path / "documents.xlsx",
        [row("cau-do", genre="riddle", villages="", body="Cai gi tron tron\nĐáp án: cái nón")],
    )

    import_documents(path)

    document = Document.objects.get(slug="cau-do")
    assert document.genre == Genre.RIDDLE
    assert document.body == "Cai gi tron tron"
    assert document.answer == "cái nón"


def test_dry_run_writes_nothing(tmp_path):
    path = build_workbook(tmp_path / "documents.xlsx", [row(villages="")])

    report = import_documents(path, dry_run=True)

    assert report.created == 1
    assert not Document.objects.exists()


def test_missing_required_column_is_rejected(tmp_path):
    workbook = Workbook()
    workbook.active.title = "Documents"
    workbook.active.append(["slug", "title"])
    workbook.save(tmp_path / "documents.xlsx")

    with pytest.raises(ValueError, match="missing required columns"):
        import_documents(tmp_path / "documents.xlsx")
