from apps.archive.models import Document, Genre, GradeLevel, License
from apps.core.models import PublicationStatus


def create_document(slug: str = "ai-ve-bo-lieu", **overrides) -> Document:
    """Minimal published folk verse; pass overrides for whatever the test cares about."""
    values = {
        "title": "Ai ve Bo Lieu",
        "genre": Genre.FOLK_VERSE,
        "body": "Ai ve Bo Lieu\nMua non la",
        "grade_level": GradeLevel.ALL,
        "source": "Dia chi Quang Tri",
        "license": License.FOLK_ATTRIBUTED,
        "status": PublicationStatus.PUBLISHED,
    }
    return Document.objects.create(slug=slug, **(values | overrides))
