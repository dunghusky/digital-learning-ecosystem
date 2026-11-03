import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.archive.models import Document, Genre, GlossaryTerm, License, Theme
from apps.core.models import PublicationStatus
from apps.villages.tests.factories import create_village

from .factories import create_document

pytestmark = pytest.mark.django_db


def test_published_queryset_hides_drafts():
    create_document("published")
    create_document("draft", status=PublicationStatus.DRAFT)

    assert [d.slug for d in Document.objects.published()] == ["published"]


def test_unknown_license_cannot_be_published():
    document = create_document(license=License.UNKNOWN)

    with pytest.raises(ValidationError) as error:
        document.full_clean()
    assert "license" in error.value.message_dict


def test_unknown_license_is_fine_for_drafts():
    document = create_document(license=License.UNKNOWN, status=PublicationStatus.DRAFT)

    document.full_clean()


def test_folk_genre_requires_source():
    document = create_document(source="  ")

    with pytest.raises(ValidationError) as error:
        document.full_clean()
    assert "source" in error.value.message_dict


def test_own_essay_needs_no_source():
    document = create_document(genre=Genre.ESSAY, source="", license=License.OWN_WORK)

    document.full_clean()


def test_only_riddles_have_an_answer():
    with pytest.raises(ValidationError) as error:
        create_document(answer="Non la").full_clean()
    assert "answer" in error.value.message_dict

    create_document("cau-do", genre=Genre.RIDDLE, answer="Non la").full_clean()


def test_document_links_villages_and_themes_both_ways():
    village = create_village("tra-loc")
    theme = Theme.objects.create(slug="que-huong", name="Que huong")
    document = create_document()
    document.villages.add(village)
    document.themes.add(theme)

    assert list(village.documents.all()) == [document]
    assert list(theme.documents.all()) == [document]


def test_glossary_term_is_unique_per_document():
    document = create_document()
    GlossaryTerm.objects.create(document=document, term="ma", explanation="me")

    with pytest.raises(IntegrityError):
        GlossaryTerm.objects.create(document=document, term="ma", explanation="khac")
