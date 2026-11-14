import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.accounts.tests.factories import create_user
from apps.archive.tests.factories import create_document
from apps.core.models import PublicationStatus
from apps.lessons.tests.factories import create_lesson
from apps.quizzes.models import QuestionKind
from apps.villages.tests.factories import create_village

from .factories import create_choice_question, create_question, create_quiz

pytestmark = pytest.mark.django_db

SCHOOL = "Truong TH va THCS Thien Thanh"


def publish(quiz):
    quiz.status = PublicationStatus.PUBLISHED
    quiz.save()
    return quiz


def client_for(user=None) -> APIClient:
    api = APIClient()
    if user:
        api.force_authenticate(user)
    return api


def quiz_slugs(response) -> list[str]:
    return [quiz["slug"] for quiz in response.json()["quizzes"]]


# --- related quizzes on lessons, villages and documents --------------------------------


def test_lesson_lists_its_published_quizzes():
    lesson = create_lesson()
    ready = create_quiz("on-tap", lesson=lesson)
    create_choice_question(ready)
    publish(ready)
    create_quiz("nhap", lesson=lesson)  # draft

    response = client_for().get(reverse("lesson-detail", kwargs={"slug": lesson.slug}))

    assert quiz_slugs(response) == ["on-tap"]


def test_village_lists_its_published_quizzes():
    village = create_village()
    quiz = create_quiz()
    create_choice_question(quiz)
    publish(quiz).villages.add(village)

    response = client_for().get(reverse("village-detail", kwargs={"code": village.code}))

    assert quiz_slugs(response) == [quiz.slug]


def test_document_lists_quizzes_that_ask_about_it_once():
    document = create_document()
    quiz = create_quiz()
    for order in (1, 2):  # two questions from the same verse: the quiz is listed once
        create_question(
            quiz, kind=QuestionKind.RIDDLE, order=order, accepted_answers="x", document=document
        )
    publish(quiz)

    response = client_for().get(reverse("document-detail", kwargs={"slug": document.slug}))

    assert quiz_slugs(response) == [quiz.slug]


# --- a class's results, for the teacher ------------------------------------------------


@pytest.fixture
def quiz():
    quiz = create_quiz()
    create_choice_question(quiz, points=2)
    create_question(quiz, kind=QuestionKind.RIDDLE, prompt="?", accepted_answers="nón")
    return publish(quiz)


def take(quiz, student, riddle_answer: str | None) -> None:
    choice_q, riddle_q = quiz.questions.order_by("order")
    answers = [{"question": choice_q.pk, "choice": choice_q.choices.get(is_correct=True).pk}]
    if riddle_answer is not None:
        answers.append({"question": riddle_q.pk, "text": riddle_answer})
    response = client_for(student).post(
        reverse("quiz-submit", kwargs={"slug": quiz.slug}), {"answers": answers}, format="json"
    )
    assert response.json()["saved"]


def results_for(user, quiz, class_name="7b"):
    return client_for(user).get(
        reverse("teaching-quiz-results"),
        {"quiz": quiz.slug, "school_name": f"  {SCHOOL} ", "class_name": class_name},
    )


def test_teacher_sees_every_student_with_best_and_latest_scores(quiz):
    an = create_user("an", school_name=SCHOOL, class_name="7B")
    create_user("binh", school_name=SCHOOL, class_name="7B")  # has not taken it yet
    create_user("chi", school_name=SCHOOL, class_name="7A")  # another class
    take(quiz, an, "nón")  # 3/3
    take(quiz, an, "sai")  # then 2/3

    response = results_for(create_user("co.lan", role=Role.TEACHER), quiz)

    assert response.status_code == 200
    data = response.json()
    assert data["max_score"] == 3
    rows = {row["username"]: row for row in data["students"]}
    assert set(rows) == {"an", "binh"}
    assert (rows["an"]["attempt_count"], rows["an"]["best_score"], rows["an"]["last_score"]) == (
        2,
        3,
        2,
    )
    assert rows["binh"]["attempt_count"] == 0 and rows["binh"]["best_score"] is None


def test_question_stats_count_each_students_latest_attempt(quiz):
    an = create_user("an", school_name=SCHOOL, class_name="7B")
    binh = create_user("binh", school_name=SCHOOL, class_name="7B")
    take(quiz, an, "nón")
    take(quiz, an, "sai")  # latest: riddle wrong
    take(quiz, binh, None)  # riddle skipped

    data = results_for(create_user("co.lan", role=Role.TEACHER), quiz).json()

    choice_stat, riddle_stat = data["questions"]
    assert (choice_stat["answered"], choice_stat["correct"]) == (2, 2)
    assert (riddle_stat["answered"], riddle_stat["correct"]) == (1, 0)


def test_only_teachers_see_class_results(quiz):
    assert results_for(create_user("an"), quiz).status_code == 403
    assert results_for(None, quiz).status_code == 401


def test_class_results_need_quiz_school_and_class(quiz):
    teacher = create_user("co.lan", role=Role.TEACHER)
    response = client_for(teacher).get(reverse("teaching-quiz-results"), {"quiz": quiz.slug})
    assert response.status_code == 400
    assert results_for(teacher, create_quiz("khong-co")).status_code == 200
    unknown = client_for(teacher).get(
        reverse("teaching-quiz-results"),
        {"quiz": "khong-ton-tai", "school_name": SCHOOL, "class_name": "7B"},
    )
    assert unknown.status_code == 404
