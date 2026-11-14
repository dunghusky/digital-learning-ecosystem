import json

import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import Role
from apps.accounts.tests.factories import create_user
from apps.core.models import PublicationStatus
from apps.lessons.tests.factories import create_lesson
from apps.quizzes.models import AttemptAnswer, QuestionKind, QuizAttempt
from apps.villages.tests.factories import create_village

from .factories import (
    create_choice_question,
    create_matching_question,
    create_question,
    create_quiz,
)

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def reset_throttle():
    cache.clear()  # Throttle counters live in the cache and would leak between tests.


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.fixture
def quiz():
    """Published quiz: a 2-point choice question, a riddle and a matching question."""
    quiz = create_quiz()
    create_choice_question(quiz, points=2, explanation="Tra Loc o Quang Tri.")
    create_question(quiz, kind=QuestionKind.RIDDLE, prompt="Cái gì?", accepted_answers="nón")
    create_matching_question(quiz)
    quiz.status = PublicationStatus.PUBLISHED
    quiz.save()
    return quiz


def client_for(user) -> APIClient:
    api = APIClient()
    api.force_authenticate(user)
    return api


def detail_url(slug: str) -> str:
    return reverse("quiz-detail", kwargs={"slug": slug})


def submit_url(slug: str) -> str:
    return reverse("quiz-submit", kwargs={"slug": slug})


def perfect_answers(quiz) -> list[dict]:
    choice_q, riddle_q, matching_q = quiz.questions.order_by("order")
    return [
        {"question": choice_q.pk, "choice": choice_q.choices.get(is_correct=True).pk},
        {"question": riddle_q.pk, "text": "Nón"},
        {
            "question": matching_q.pk,
            "matches": {str(p.pk): p.right for p in matching_q.pairs.all()},
        },
    ]


# --- reading ---------------------------------------------------------------------------


def test_list_is_public_hides_drafts_and_counts_questions(client, quiz):
    create_quiz("nhap")

    response = client.get(reverse("quiz-list"))

    assert response.status_code == 200
    results = response.json()["results"]
    assert [(q["slug"], q["question_count"]) for q in results] == [(quiz.slug, 3)]
    assert client.get(detail_url("nhap")).status_code == 404


def test_list_filters_by_village_and_lesson(client, quiz):
    village = create_village()
    quiz.villages.add(village)
    quiz.lesson = create_lesson()
    quiz.save()
    other = create_quiz("khac")
    create_choice_question(other)
    other.status = PublicationStatus.PUBLISHED
    other.save()

    by_village = client.get(reverse("quiz-list"), {"village": village.code}).json()["results"]
    by_lesson = client.get(reverse("quiz-list"), {"lesson": quiz.lesson.slug}).json()["results"]

    assert [q["slug"] for q in by_village] == [quiz.slug]
    assert [q["slug"] for q in by_lesson] == [quiz.slug]


def test_unpublished_lesson_is_not_linked(client, quiz):
    quiz.lesson = create_lesson(status=PublicationStatus.DRAFT)
    quiz.save()

    assert client.get(detail_url(quiz.slug)).json()["lesson"] is None


def test_detail_never_reveals_answers(client, quiz):
    response = client.get(detail_url(quiz.slug))

    assert response.status_code == 200
    body = json.dumps(response.json(), ensure_ascii=False)
    for secret in ["is_correct", "accepted_answers", "explanation", 'nón"', "solution"]:
        assert secret not in body
    choice_q, riddle_q, matching_q = response.json()["questions"]
    assert [c["text"] for c in choice_q["choices"]] == ["Quang Tri", "Ha Noi"]
    assert riddle_q["choices"] == riddle_q["left_items"] == []
    assert [item["left"] for item in matching_q["left_items"]] == ["Tra Loc", "Cua Viet"]
    assert sorted(matching_q["right_items"]) == ["non la", "nuoc mam"]


# --- grading ---------------------------------------------------------------------------


def test_guest_is_graded_but_nothing_is_saved(client, quiz):
    response = client.post(submit_url(quiz.slug), {"answers": perfect_answers(quiz)}, format="json")

    assert response.status_code == 200
    data = response.json()
    assert (data["score"], data["max_score"], data["saved"]) == (4, 4, False)
    assert data["results"][0]["explanation"] == "Tra Loc o Quang Tri."
    assert not QuizAttempt.objects.exists()


def test_student_attempt_is_saved_with_each_answer(quiz):
    student = create_user("an")
    answers = perfect_answers(quiz)
    answers[1]["text"] = "non"  # accents matter

    response = client_for(student).post(
        submit_url(quiz.slug), {"answers": answers, "duration_seconds": 95}, format="json"
    )

    data = response.json()
    assert (data["score"], data["max_score"], data["saved"]) == (3, 4, True)
    attempt = QuizAttempt.objects.get(pk=data["attempt"])
    assert (attempt.student, attempt.score, attempt.duration_seconds) == (student, 3, 95)
    wrong = AttemptAnswer.objects.get(attempt=attempt, is_correct=False)
    assert wrong.response == {"text": "non"}


def test_teacher_trying_a_quiz_is_not_saved(quiz):
    teacher = create_user("co.lan", role=Role.TEACHER)

    response = client_for(teacher).post(submit_url(quiz.slug), {"answers": []}, format="json")

    assert response.json()["saved"] is False
    assert not QuizAttempt.objects.exists()


def test_empty_submission_scores_zero(client, quiz):
    data = client.post(submit_url(quiz.slug), {"answers": []}, format="json").json()

    assert (data["score"], data["max_score"]) == (0, 4)
    assert len(data["results"]) == 3


@pytest.mark.parametrize("problem", ["foreign", "duplicate"])
def test_answers_must_belong_to_the_quiz_once(client, quiz, problem):
    answers = perfect_answers(quiz)
    if problem == "foreign":
        other = create_choice_question(create_quiz("khac"))
        answers.append({"question": other.pk, "choice": 1})
    else:
        answers.append(answers[0])

    response = client.post(submit_url(quiz.slug), {"answers": answers}, format="json")

    assert response.status_code == 400


def test_draft_quiz_cannot_be_submitted(client):
    draft = create_quiz("nhap")
    assert client.post(submit_url(draft.slug), {"answers": []}, format="json").status_code == 404


def test_grading_is_throttled(client, quiz, monkeypatch):
    # Rates are read once when DRF loads, so patch the throttle rather than the settings.
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"quiz": "2/min"})
    url = submit_url(quiz.slug)

    statuses = [client.post(url, {"answers": []}, format="json").status_code for _ in range(3)]

    assert statuses == [200, 200, 429]
    assert client.get(detail_url(quiz.slug)).status_code == 200  # reading is not throttled


# --- my attempts -----------------------------------------------------------------------


def test_my_attempts_lists_only_my_own_newest_first(quiz):
    me, classmate = create_user("an"), create_user("binh")
    for user in (me, me, classmate):
        client_for(user).post(submit_url(quiz.slug), {"answers": []}, format="json")

    response = client_for(me).get(reverse("quiz-attempt-list"), {"quiz": quiz.slug})

    results = response.json()["results"]
    assert len(results) == 2
    assert results[0]["id"] > results[1]["id"]
    assert results[0]["quiz"]["slug"] == quiz.slug


def test_my_attempts_needs_sign_in(client):
    assert client.get(reverse("quiz-attempt-list")).status_code == 401
