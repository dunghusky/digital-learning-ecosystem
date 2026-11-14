import pytest

from .factories import create_lesson, create_task

pytestmark = pytest.mark.django_db


@pytest.fixture
def editor_client(client, django_user_model):
    django_user_model.objects.create_superuser("teacher", password="pw")
    client.login(username="teacher", password="pw")
    return client


def test_changelist_shows_task_count(editor_client):
    lesson = create_lesson()
    create_task(lesson, order=1)
    create_task(lesson, order=2)

    response = editor_client.get("/admin/lessons/lesson/")

    assert response.status_code == 200
    assert response.context["cl"].result_list[0].task_count == 2


def test_add_form_defaults_author_to_current_user(editor_client, django_user_model):
    response = editor_client.get("/admin/lessons/lesson/add/")

    assert response.status_code == 200
    teacher = django_user_model.objects.get(username="teacher")
    assert response.context["adminform"].form.initial["author"] == teacher.pk


def test_change_form_renders_with_inlines(editor_client):
    lesson = create_lesson()
    create_task(lesson)

    response = editor_client.get(f"/admin/lessons/lesson/{lesson.pk}/change/")

    assert response.status_code == 200
    assert len(response.context["inline_admin_formsets"]) == 2
