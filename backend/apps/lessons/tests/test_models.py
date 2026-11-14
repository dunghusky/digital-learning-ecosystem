import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.archive.tests.factories import create_document
from apps.core.models import PublicationStatus
from apps.lessons.models import Lesson, LessonDocument, Subject, subject_for_grade

from .factories import create_lesson, create_task

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ("grade", "subject"),
    [(1, "vietnamese"), (5, "vietnamese"), (6, "literature"), (9, "literature")],
)
def test_subject_follows_grade(grade, subject):
    assert subject_for_grade(grade) == subject


def test_clean_rejects_subject_that_does_not_match_grade():
    lesson = create_lesson(status=PublicationStatus.DRAFT)
    lesson.subject = Subject.VIETNAMESE
    with pytest.raises(ValidationError) as error:
        lesson.full_clean()
    assert "subject" in error.value.message_dict


@pytest.mark.parametrize("grade", [0, 10])
def test_grade_outside_1_to_9_is_rejected_by_the_database(grade):
    with pytest.raises(IntegrityError), transaction.atomic():
        create_lesson(grade=grade)


def test_publishing_stamps_published_at():
    lesson = create_lesson(status=PublicationStatus.DRAFT)
    assert lesson.published_at is None
    lesson.status = PublicationStatus.PUBLISHED
    lesson.save()
    assert lesson.published_at is not None
    assert list(Lesson.objects.published()) == [lesson]


def test_objective_list_skips_blank_lines():
    lesson = create_lesson(objectives="Doc hieu ca dao\n\n  Viet doan van  \n")
    assert lesson.objective_list == ["Doc hieu ca dao", "Viet doan van"]


def test_documents_and_tasks_keep_their_order():
    lesson = create_lesson()
    second, first = create_document("b"), create_document("a")
    LessonDocument.objects.create(lesson=lesson, document=second, order=2)
    LessonDocument.objects.create(lesson=lesson, document=first, order=1)
    create_task(lesson, order=2, prompt="later")
    create_task(lesson, order=1, prompt="first")

    assert [link.document for link in lesson.lesson_documents.all()] == [first, second]
    assert [task.prompt for task in lesson.tasks.all()] == ["first", "later"]
    assert set(first.lessons.all()) == {lesson}


def test_a_document_is_linked_to_a_lesson_once():
    lesson, document = create_lesson(), create_document()
    LessonDocument.objects.create(lesson=lesson, document=document)
    with pytest.raises(IntegrityError), transaction.atomic():
        LessonDocument.objects.create(lesson=lesson, document=document, order=1)
