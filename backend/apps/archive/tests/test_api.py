import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.archive.models import Genre, GlossaryTerm, GradeLevel, Theme
from apps.core.models import PublicationStatus
from apps.villages.tests.factories import create_village

from .factories import create_document

pytestmark = pytest.mark.django_db


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def slugs(response) -> list[str]:
    payload = response.json()
    items = payload["results"] if isinstance(payload, dict) else payload
    return [item["slug"] for item in items]


def test_list_is_public_and_hides_drafts(client):
    create_document("published")
    create_document("draft", status=PublicationStatus.DRAFT)

    response = client.get(reverse("document-list"))

    assert response.status_code == 200
    assert slugs(response) == ["published"]


def test_detail_hides_internal_fields_and_drafts(client):
    create_document("secret", status=PublicationStatus.DRAFT)
    create_document(notes="internal", permission_note="Ba X dong y")

    assert client.get(reverse("document-detail", kwargs={"slug": "secret"})).status_code == 404
    payload = client.get(reverse("document-detail", kwargs={"slug": "ai-ve-bo-lieu"})).json()
    assert "notes" not in payload
    assert "permission_note" not in payload


def test_detail_includes_glossary_questions_and_links(client):
    village = create_village("bo-lieu", name="Lang non la Bo Lieu")
    document = create_document(reading_questions="Cau 1?\n\nCau 2?")
    document.villages.add(village)
    GlossaryTerm.objects.create(document=document, term="ma", explanation="me")

    payload = client.get(reverse("document-detail", kwargs={"slug": document.slug})).json()

    assert payload["villages"] == [
        {"code": "bo-lieu", "name": "Lang non la Bo Lieu", "craft_type": "conical_hat"}
    ]
    assert payload["glossary"] == [{"term": "ma", "explanation": "me"}]
    assert payload["reading_questions"] == ["Cau 1?", "Cau 2?"]


def test_related_shares_a_village_or_theme_and_skips_drafts(client):
    village = create_village("tra-loc")
    theme = Theme.objects.create(slug="que-huong", name="Que huong")
    main = create_document("main")
    main.villages.add(village)
    by_village = create_document("by-village")
    by_village.villages.add(village)
    by_theme = create_document("by-theme")
    by_theme.themes.add(theme)
    main.themes.add(theme)
    create_document("unrelated")
    draft = create_document("draft", status=PublicationStatus.DRAFT)
    draft.villages.add(village)

    payload = client.get(reverse("document-detail", kwargs={"slug": "main"})).json()

    assert sorted(item["slug"] for item in payload["related"]) == ["by-theme", "by-village"]


def test_filters_by_genre_village_and_theme(client):
    village = create_village("tra-loc")
    theme = Theme.objects.create(slug="cau-do", name="Cau do")
    riddle = create_document("riddle", genre=Genre.RIDDLE, answer="Non")
    riddle.villages.add(village)
    riddle.themes.add(theme)
    create_document("verse")

    assert slugs(client.get(reverse("document-list"), {"genre": "riddle"})) == ["riddle"]
    assert slugs(client.get(reverse("document-list"), {"village": "tra-loc"})) == ["riddle"]
    assert slugs(client.get(reverse("document-list"), {"theme": "cau-do"})) == ["riddle"]


def test_list_cards_carry_an_excerpt_and_riddle_answers(client):
    create_document("verse", body="  Line 1\n\nLine 2\nLine 3\nLine 4\nLine 5")
    create_document("riddle", genre=Genre.RIDDLE, answer="Cai non")

    items = {item["slug"]: item for item in client.get(reverse("document-list")).json()["results"]}

    assert items["verse"]["excerpt"] == ["Line 1", "Line 2", "Line 3", "Line 4"]
    assert items["riddle"]["answer"] == "Cai non"


def test_random_honours_filters_and_skips_drafts(client):
    create_document("verse")
    create_document("riddle", genre=Genre.RIDDLE)
    create_document("draft", genre=Genre.LEGEND, status=PublicationStatus.DRAFT)

    picked = client.get(reverse("document-random"), {"genre": "riddle"})

    assert picked.json() == {"slug": "riddle"}
    assert client.get(reverse("document-random"), {"genre": "legend"}).status_code == 404


def test_grade_filter_includes_documents_for_all_grades(client):
    create_document("primary", grade_level=GradeLevel.PRIMARY)
    create_document("secondary", grade_level=GradeLevel.SECONDARY)
    create_document("shared", grade_level=GradeLevel.ALL)

    found = slugs(client.get(reverse("document-list"), {"grade_level": "primary"}))

    assert sorted(found) == ["primary", "shared"]


def test_search_ignores_diacritics(client):
    create_document("nuoc-mam", title="Nước mắm Mỹ Thủy")
    create_document("non-la", title="Nón lá Trà Lộc")

    assert slugs(client.get(reverse("document-list"), {"search": "nuoc mam"})) == ["nuoc-mam"]
    assert slugs(client.get(reverse("document-list"), {"search": "NUOC MAM"})) == ["nuoc-mam"]


def test_search_through_many_to_many_does_not_duplicate(client):
    document = create_document()
    document.themes.add(
        Theme.objects.create(slug="que-huong", name="Que huong"),
        Theme.objects.create(slug="que-nha", name="Que nha"),
    )

    assert slugs(client.get(reverse("document-list"), {"search": "que"})) == ["ai-ve-bo-lieu"]


def test_featured_is_stable_and_respects_genre(client):
    create_document("verse")
    create_document("riddle", genre=Genre.RIDDLE)

    first = client.get(reverse("document-featured"), {"genre": "riddle"})
    second = client.get(reverse("document-featured"), {"genre": "riddle"})

    assert first.status_code == 200
    assert first.json()["slug"] == second.json()["slug"] == "riddle"
    assert client.get(reverse("document-featured"), {"genre": "legend"}).status_code == 404


def test_genres_counts_published_documents(client):
    create_document("a")
    create_document("b")
    create_document("c", genre=Genre.PROVERB)
    create_document("d", genre=Genre.PROVERB, status=PublicationStatus.DRAFT)

    assert client.get(reverse("document-genres")).json() == [
        {"genre": "folk_verse", "count": 2},
        {"genre": "proverb", "count": 1},
    ]


def test_unpublished_villages_are_not_listed(client):
    document = create_document()
    document.villages.add(
        create_village("tra-loc"), create_village("draft", status=PublicationStatus.DRAFT)
    )

    listed = client.get(reverse("document-list")).json()["results"][0]["villages"]
    detail = client.get(reverse("document-detail", kwargs={"slug": document.slug})).json()

    assert [v["code"] for v in listed] == ["tra-loc"]
    assert [v["code"] for v in detail["villages"]] == ["tra-loc"]
