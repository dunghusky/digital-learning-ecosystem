from django.contrib.postgres.operations import UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):
    """Enables Postgres `unaccent`, so "nuoc mam" finds "nước mắm" (see core.filters)."""

    initial = True
    dependencies = []
    operations = [UnaccentExtension()]
