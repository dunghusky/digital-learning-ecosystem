"""Building blocks shared by the Excel importers (villages, documents)."""

from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ImportReport:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"created={self.created} updated={self.updated} "
            f"skipped={self.skipped} errors={len(self.errors)}"
        )


def clean_text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def split_list(value: Any) -> list[str]:
    """Comma-separated cell such as "tra-loc, bo-lieu" -> ["tra-loc", "bo-lieu"]."""
    return [item.strip() for item in clean_text(value).split(",") if item.strip()]


def read_sheet(
    path: Path,
    sheet_name: str,
    *,
    key_row: int,
    required: list[str],
    aliases: dict[str, str] | None = None,
) -> Iterator[tuple[int, dict[str, Any]]]:
    """Yield ``(row_number, {field: value})`` for every data row below ``key_row``.

    ``key_row`` holds the field keys; rows above it are free-form labels for humans.
    ``aliases`` renames workbook keys to model field names where they differ.
    """
    from openpyxl import load_workbook  # imported lazily: only needed for imports

    aliases = aliases or {}
    workbook = load_workbook(path, data_only=True, read_only=True)
    try:
        if sheet_name not in workbook.sheetnames:
            raise ValueError(f"Workbook has no '{sheet_name}' sheet")
        sheet = workbook[sheet_name]
        header = next(sheet.iter_rows(min_row=key_row, max_row=key_row, values_only=True))
        keys = [aliases.get(key, key) for key in map(clean_text, header)]
        missing = [name for name in required if name not in keys]
        if missing:
            raise ValueError(f"Workbook is missing required columns: {', '.join(missing)}")

        first_data_row = key_row + 1
        for row_number, row in enumerate(
            sheet.iter_rows(min_row=first_data_row, values_only=True), start=first_data_row
        ):
            yield row_number, {key: value for key, value in zip(keys, row, strict=False) if key}
    finally:
        workbook.close()
