import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.archive.models import GlossaryTerm
from apps.archive.tests.factories import create_document
from apps.core.models import PublicationStatus
from apps.lessons.models import LessonDocument, Subject
from apps.villages.tests.factories import create_village

from .factories import create_lesson, create_task

pytestmark = pytest.mark.django_db


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def slugs(response) -> list[str]:
    return [item["slug"] for item in response.json()["results"]]


def detail_url(slug: str) -> str:
    return reverse("lesson-detail", kwargs={"slug": slug})


def test_list_is_public_and_hides_drafts(client):
    create_lesson("published")
    create_lesson("draft", status=PublicationStatus.DRAFT)

    response = client.get(reverse("lesson-list"))

    assert response.status_code == 200
    assert slugs(response) == ["published"]
    assert client.get(detail_url("draft")).status_code == 404


def test_list_counts_tasks_and_only_published_documents(client):
    lesson = create_lesson(objectives="Doc hieu\nViet doan van")
    create_task(lesson, order=1)
    create_task(lesson, order=2)
    LessonDocument.objects.create(lesson=lesson, document=create_document("public"))
    LessonDocument.objects.create(
        lesson=lesson, document=create_document("hidden", status=PublicationStatus.DRAFT)
    )

    [item] = client.get(reverse("lesson-list")).json()["results"]

    assert item["task_count"] == 2
    assert item["document_count"] == 1
    assert item["objectives"] == ["Doc hieu", "Viet doan van"]


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ({"subject": Subject.VIETNAMESE}, ["lop-4"]),
        ({"grade": 7}, ["lop-7"]),
        ({"village": "tra-loc"}, ["lop-7"]),
        ({"document": "ai-ve-bo-lieu"}, ["lop-4"]),
    ],
)
def test_list_filters(client, query, expected):
    grade_7 = create_lesson("lop-7")
    grade_4 = create_lesson("lop-4", subject=Subject.VIETNAMESE, grade=4)
    grade_7.villages.add(create_village("tra-loc"))
    LessonDocument.objects.create(lesson=grade_4, document=create_document("ai-ve-bo-lieu"))

    assert slugs(client.get(reverse("lesson-list"), query)) == expected


def test_detail_has_readings_in_order_and_tasks(client, django_user_model):
    teacher = django_user_model.objects.create_user(
        "gv", password="pw", first_name="Lan", last_name="Nguyen"
    )
    lesson = create_lesson(author=teacher)
    later, first = create_document("b"), create_document("a")
    GlossaryTerm.objects.create(document=first, term="ma", explanation="me")
    LessonDocument.objects.create(lesson=lesson, document=later, order=2)
    LessonDocument.objects.create(lesson=lesson, document=first, order=1, note="Doc to")
    LessonDocument.objects.create(
        lesson=lesson, document=create_document("draft", status=PublicationStatus.DRAFT), order=0
    )
    create_task(lesson, order=1, hint="Chu y cau 2")

    payload = client.get(detail_url(lesson.slug)).json()

    assert [reading["document"]["slug"] for reading in payload["readings"]] == ["a", "b"]
    assert payload["readings"][0]["note"] == "Doc to"
    assert payload["readings"][0]["document"]["glossary"] == [{"term": "ma", "explanation": "me"}]
    assert "body" in payload["readings"][0]["document"]
    assert payload["tasks"][0]["hint"] == "Chu y cau 2"
    assert payload["author_name"] == teacher.display_name


def test_detail_hides_draft_villages(client):
    lesson = create_lesson()
    lesson.villages.add(create_village("public"), create_village("draft", status="draft"))

    payload = client.get(detail_url(lesson.slug)).json()

    assert [village["code"] for village in payload["villages"]] == ["public"]


def test_document_and_village_list_their_published_lessons(client):
    document, village = create_document(), create_village("tra-loc")
    for slug, status in [("public", PublicationStatus.PUBLISHED), ("draft", "draft")]:
        lesson = create_lesson(slug, status=status)
        lesson.villages.add(village)
        LessonDocument.objects.create(lesson=lesson, document=document)

    document_payload = client.get(reverse("document-detail", kwargs={"slug": document.slug}))
    village_payload = client.get(reverse("village-detail", kwargs={"code": village.code}))

    expected = [{"slug": "public", "title": "Non la Tra Loc", "subject": "literature", "grade": 7}]
    assert document_payload.json()["lessons"] == expected
    assert village_payload.json()["lessons"] == expected
