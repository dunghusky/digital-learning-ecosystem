from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.villages.importers import import_villages


class Command(BaseCommand):
    help = "Import craft villages from the data-collection workbook (Villages sheet)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("path", type=Path, help="Path to the .xlsx workbook")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report without writing anything to the database",
        )
        parser.add_argument(
            "--publish",
            action="store_true",
            help="Publish imported villages immediately instead of leaving them as drafts",
        )

    def handle(self, *args, **options) -> None:
        path: Path = options["path"]
        if not path.exists():
            raise CommandError(f"File not found: {path}")

        try:
            report = import_villages(path, dry_run=options["dry_run"], publish=options["publish"])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        for error in report.errors:
            self.stderr.write(self.style.WARNING(error))
        message = f"{'[dry run] ' if options['dry_run'] else ''}{report.summary()}"
        self.stdout.write(self.style.SUCCESS(message))
