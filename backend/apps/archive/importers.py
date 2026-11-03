"""Import archive documents from the data-collection workbook (docs/data/documents.xlsx).

Sheet layout: row 1 holds the field keys (see plan section 4.4) and the data starts on row 2.
Documents are matched by ``slug``, so re-importing an updated workbook refreshes existing rows;
their villages, themes and glossary are replaced by what the workbook says.
"""

import re
from pathlib import Path
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.core.importing import ImportReport, clean_text, read_sheet, split_list
from apps.core.models import PublicationStatus
from apps.villages.models import CraftVillage

from .models import Document, Genre, GlossaryTerm, GradeLevel, License, Theme

SHEET_NAME = "Documents"
KEY_ROW = 1
REQUIRED_FIELDS = ["slug", "title", "genre", "body", "grade_level", "license"]
TEXT_FIELDS = [
    "title",
    "body",
    "summary",
    "answer",
    "reading_questions",
    "author",
    "collector",
    "source",
    "source_url",
    "permission_note",
    "notes",
]
CHOICE_FIELDS = {"genre": Genre, "grade_level": GradeLevel, "license": License}

# Riddles collected before the `answer` column existed end with a line like "Đáp án: cái nón".
ANSWER_LINE = re.compile(r"\n\s*đáp án\s*:\s*(?P<answer>.+?)\s*$", re.IGNORECASE)


def _choice(raw: dict[str, Any], name: str, row: int, report: ImportReport) -> str | None:
    value = clean_text(raw.get(name))
    if value not in CHOICE_FIELDS[name].values:
        report.errors.append(f"Row {row}: unknown {name} '{value}'")
        return None
    return value


def _split_answer(body: str) -> tuple[str, str]:
    """Move a trailing "Đáp án: …" line out of a riddle's body."""
    if match := ANSWER_LINE.search(body):
        return body[: match.start()].rstrip(), match["answer"]
    return body, ""


def _glossary(value: Any, row: int, report: ImportReport) -> dict[str, str]:
    """One "term: explanation" per line; later duplicates of a term win."""
    terms = {}
    for line in clean_text(value).splitlines():
        if not line.strip():
            continue
        term, separator, explanation = line.partition(":")
        if not separator or not term.strip() or not explanation.strip():
            report.errors.append(f"Row {row}: glossary line needs 'term: explanation': {line}")
            continue
        terms[term.strip()] = explanation.strip()
    return terms


def _themes(slugs: list[str]) -> list[Theme]:
    """Unknown theme slugs are created with a provisional name editors can refine in admin."""
    return [
        Theme.objects.get_or_create(
            slug=slug, defaults={"name": slug.replace("-", " ").capitalize()}
        )[0]
        for slug in slugs
    ]


def _villages(codes: list[str], row: int, report: ImportReport) -> list[CraftVillage]:
    villages = list(CraftVillage.objects.filter(code__in=codes))
    for code in set(codes) - {village.code for village in villages}:
        report.errors.append(f"Row {row}: unknown village code '{code}' (link skipped)")
    return villages


def import_documents(path: Path, *, dry_run: bool = False, publish: bool = False) -> ImportReport:
    report = ImportReport()
    rows = read_sheet(path, SHEET_NAME, key_row=KEY_ROW, required=REQUIRED_FIELDS)

    with transaction.atomic():
        for row_number, raw in rows:
            slug = clean_text(raw.get("slug"))
            if not slug:
                continue

            choices = {name: _choice(raw, name, row_number, report) for name in CHOICE_FIELDS}
            values = {name: clean_text(raw.get(name)) for name in TEXT_FIELDS}
            if None in choices.values() or not (values["title"] and values["body"]):
                report.skipped += 1
                if values["title"] and values["body"]:
                    continue  # the unknown choice was already reported
                report.errors.append(f"Row {row_number}: missing title or body")
                continue
            values.update(choices)
            if values["genre"] == Genre.RIDDLE and not values["answer"]:
                values["body"], values["answer"] = _split_answer(values["body"])

            document = Document.objects.filter(slug=slug).first() or Document(slug=slug)
            created = document.pk is None
            for name, value in values.items():
                setattr(document, name, value)
            # Without --publish the editorial status is left untouched, so re-importing never
            # unpublishes a document an editor already reviewed. Unlicensed rows stay drafts.
            if publish and document.license != License.UNKNOWN:
                document.status = PublicationStatus.PUBLISHED

            try:
                document.clean()
            except ValidationError as error:
                report.skipped += 1
                report.errors.extend(f"Row {row_number}: {msg}" for msg in error.messages)
                continue

            document.save()
            document.villages.set(_villages(split_list(raw.get("villages")), row_number, report))
            document.themes.set(_themes(split_list(raw.get("themes"))))
            document.glossary.all().delete()
            GlossaryTerm.objects.bulk_create(
                GlossaryTerm(document=document, term=term, explanation=explanation)
                for term, explanation in _glossary(raw.get("glossary"), row_number, report).items()
            )

            if created:
                report.created += 1
            else:
                report.updated += 1

        if dry_run:
            transaction.set_rollback(True)

    return report
