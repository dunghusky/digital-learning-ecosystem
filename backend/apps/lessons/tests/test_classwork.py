from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.accounts.tests.factories import create_user
from apps.core.models import PublicationStatus
from apps.lessons.models import Assignment, Submission

from .factories import create_lesson, create_task

pytestmark = pytest.mark.django_db

SCHOOL = "Truong TH va THCS Thien Thanh"


def client_for(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def teacher():
    return create_user("co.lan", role=Role.TEACHER, first_name="Lan")


@pytest.fixture
def student():
    return create_user("an", school_name=SCHOOL, class_name="7B")


@pytest.fixture
def lesson():
    lesson = create_lesson()
    create_task(lesson, order=1)
    create_task(lesson, order=2, prompt="Viet doan van")
    return lesson


@pytest.fixture
def assignment(lesson, teacher):
    return Assignment.objects.create(
        lesson=lesson, teacher=teacher, school_name=SCHOOL, class_name="7B"
    )


def tasks(lesson) -> list[int]:
    return list(lesson.tasks.values_list("pk", flat=True))


def submission_url(assignment, name="submission") -> str:
    return reverse(f"assignment-{name}", kwargs={"pk": assignment.pk})


# --- Matching a class by the names students typed -------------------------------------------


def test_assignment_normalizes_names_and_matches_case_insensitively(lesson, teacher, student):
    assignment = Assignment.objects.create(
        lesson=lesson,
        teacher=teacher,
        school_name="  truong th va  thcs thien thanh ",
        class_name="7 b",
    )
    other_class = create_user("binh", school_name=SCHOOL, class_name="7A")

    assert (assignment.school_name, assignment.class_name) == (
        "truong th va thcs thien thanh",
        "7B",
    )
    assert list(Assignment.objects.for_student(student)) == [assignment]
    assert not Assignment.objects.for_student(other_class).exists()


def test_draft_lessons_are_not_listed_for_students(assignment, student):
    assignment.lesson.status = PublicationStatus.DRAFT
    assignment.lesson.save()

    assert client_for(student).get(reverse("assignment-list")).json() == []


# --- Student ----------------------------------------------------------------------------------


def test_student_lists_assignments_with_their_submission(assignment, student):
    response = client_for(student).get(reverse("assignment-list"))

    assert response.status_code == 200
    [item] = response.json()
    assert item["lesson"]["slug"] == assignment.lesson.slug
    assert item["teacher_name"] == "Lan"
    assert item["submission"] is None


def test_only_students_and_signed_in_users_see_assignments(teacher):
    assert APIClient().get(reverse("assignment-list")).status_code == 401
    assert client_for(teacher).get(reverse("assignment-list")).status_code == 403


def test_another_class_cannot_open_the_assignment(assignment):
    stranger = create_user("binh", school_name=SCHOOL, class_name="6A")
    assert client_for(stranger).get(submission_url(assignment)).status_code == 404


def test_student_saves_a_draft_then_hands_it_in(assignment, student):
    client = client_for(student)
    first, second = tasks(assignment.lesson)
    assert client.get(submission_url(assignment)).status_code == 404

    draft = client.put(
        submission_url(assignment),
        {"answers": [{"task": first, "text": "Nghe non la"}]},
        format="json",
    )
    assert draft.status_code == 200
    assert draft.json()["status"] == "draft"

    handed_in = client.post(
        submission_url(assignment, "submit"),
        {"answers": [{"task": second, "text": "Doan van"}]},
        format="json",
    )
    assert handed_in.status_code == 200
    payload = handed_in.json()
    assert payload["status"] == "submitted"
    assert payload["submitted_at"] is not None
    assert payload["is_late"] is False
    assert [answer["text"] for answer in payload["answers"]] == ["Nghe non la", "Doan van"]


def test_handed_in_work_cannot_change(assignment, student):
    client = client_for(student)
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "Xong"}]}
    client.post(submission_url(assignment, "submit"), body, format="json")

    assert client.put(submission_url(assignment), body, format="json").status_code == 409
    assert client.post(submission_url(assignment, "submit"), body, format="json").status_code == 409


def test_empty_work_cannot_be_handed_in(assignment, student):
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "   "}]}
    response = client_for(student).post(submission_url(assignment, "submit"), body, format="json")

    assert response.status_code == 400
    assert not Submission.objects.exists()  # The failed hand-in saves nothing.


@pytest.mark.parametrize("problem", ["foreign_task", "duplicate_task"])
def test_answers_must_match_the_lesson_tasks(assignment, student, problem):
    first = tasks(assignment.lesson)[0]
    if problem == "foreign_task":
        answers = [{"task": create_task(create_lesson("other")).pk, "text": "x"}]
    else:
        answers = [{"task": first, "text": "a"}, {"task": first, "text": "b"}]

    response = client_for(student).put(
        submission_url(assignment), {"answers": answers}, format="json"
    )

    assert response.status_code == 400
    assert "answers" in response.json()


def test_late_work_is_flagged(assignment, student):
    assignment.due_at = timezone.now() - timedelta(days=1)
    assignment.save()
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "Muon"}]}

    payload = (
        client_for(student).post(submission_url(assignment, "submit"), body, format="json").json()
    )

    assert payload["is_late"] is True


# --- Teacher ----------------------------------------------------------------------------------


def test_teacher_assigns_a_lesson_once_per_class(lesson, teacher):
    client = client_for(teacher)
    body = {"lesson": lesson.slug, "school_name": SCHOOL, "class_name": "7b"}

    created = client.post(reverse("teaching-assignment-list"), body, format="json")
    duplicate = client.post(
        reverse("teaching-assignment-list"), body | {"school_name": SCHOOL.upper()}, format="json"
    )

    assert created.status_code == 201
    assert created.json()["class_name"] == "7B"
    assert Assignment.objects.get().teacher == teacher
    assert duplicate.status_code == 400
    assert "class_name" in duplicate.json()


def test_draft_lessons_cannot_be_assigned(teacher):
    create_lesson("draft", status=PublicationStatus.DRAFT)
    body = {"lesson": "draft", "school_name": SCHOOL, "class_name": "7B"}

    response = client_for(teacher).post(reverse("teaching-assignment-list"), body, format="json")

    assert response.status_code == 400


def test_students_cannot_use_the_teacher_api(student):
    assert client_for(student).get(reverse("teaching-assignment-list")).status_code == 403


def test_teachers_only_see_their_own_assignments(assignment):
    other = create_user("thay.minh", role=Role.TEACHER)
    client = client_for(other)

    assert client.get(reverse("teaching-assignment-list")).json() == []
    url = reverse("teaching-assignment-detail", kwargs={"pk": assignment.pk})
    assert client.get(url).status_code == 404


def test_class_list_shows_every_student_and_their_status(assignment, teacher, student):
    create_user("binh", school_name=SCHOOL, class_name="7b")
    create_user("chi", school_name=SCHOOL, class_name="6A")
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "Bai cua An"}]}
    client_for(student).post(submission_url(assignment, "submit"), body, format="json")

    url = reverse("teaching-assignment-submissions", kwargs={"pk": assignment.pk})
    rows = client_for(teacher).get(url).json()

    by_name = {row["student"]["username"]: row["submission"] for row in rows}
    assert set(by_name) == {"an", "binh"}
    assert by_name["an"]["status"] == "submitted"
    assert by_name["binh"] is None
    listed = client_for(teacher).get(reverse("teaching-assignment-list")).json()
    assert listed[0]["submitted_count"] == 1


def test_teacher_gives_and_updates_feedback(assignment, teacher, student):
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "Bai cua An"}]}
    client_for(student).post(submission_url(assignment, "submit"), body, format="json")
    submission = Submission.objects.get()
    url = reverse("teaching-submission-feedback", kwargs={"pk": submission.pk})
    client = client_for(teacher)

    client.put(url, {"comment": "Kha", "score": 7}, format="json")
    response = client.put(url, {"comment": "Tot", "score": 8.5}, format="json")

    assert response.status_code == 200
    assert response.json()["feedback"]["comment"] == "Tot"
    assert response.json()["feedback"]["score"] == 8.5
    seen = client_for(student).get(reverse("assignment-list")).json()[0]["submission"]
    assert seen["feedback"]["teacher_name"] == "Lan"


@pytest.mark.parametrize("score", [-1, 10.5])
def test_score_is_out_of_ten(assignment, teacher, student, score):
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "Bai"}]}
    client_for(student).post(submission_url(assignment, "submit"), body, format="json")
    url = reverse("teaching-submission-feedback", kwargs={"pk": Submission.objects.get().pk})

    response = client_for(teacher).put(url, {"comment": "x", "score": score}, format="json")

    assert response.status_code == 400


def test_drafts_and_other_teachers_work_cannot_get_feedback(assignment, teacher, student):
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "Nhap"}]}
    client_for(student).put(submission_url(assignment), body, format="json")
    url = reverse("teaching-submission-feedback", kwargs={"pk": Submission.objects.get().pk})

    assert client_for(teacher).put(url, {"comment": "x"}, format="json").status_code == 404
    other = create_user("thay.minh", role=Role.TEACHER)
    assert client_for(other).put(url, {"comment": "x"}, format="json").status_code == 404


def test_class_list_hides_the_answers_of_drafts(assignment, teacher, student):
    body = {"answers": [{"task": tasks(assignment.lesson)[0], "text": "Nhap rieng"}]}
    client_for(student).put(submission_url(assignment), body, format="json")

    url = reverse("teaching-assignment-submissions", kwargs={"pk": assignment.pk})
    [row] = client_for(teacher).get(url).json()

    assert row["submission"]["status"] == "draft"
    assert row["submission"]["answers"] == []
