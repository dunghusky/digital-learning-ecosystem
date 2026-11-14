import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import Role, User

from .factories import create_user

pytestmark = pytest.mark.django_db

PASSWORD = "lang-non-la-2026"
SIGN_UP = {
    "username": "an.nguyen",
    "password": PASSWORD,
    "school_name": "Truong TH va THCS Thien Thanh",
    "class_name": "6A",
}


@pytest.fixture(autouse=True)
def reset_throttle():
    cache.clear()  # Throttle counters live in the cache and would leak between tests.


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def register(client: APIClient, **overrides):
    return client.post(reverse("auth-register"), {**SIGN_UP, **overrides}, format="json")


def login(client: APIClient, username: str = "an.nguyen", password: str = PASSWORD):
    return client.post(
        reverse("token-obtain"), {"username": username, "password": password}, format="json"
    )


def test_register_creates_a_student_without_signing_in(client):
    response = register(client, phone="0912345678", email="an@example.com")

    assert response.status_code == 201
    payload = response.json()
    assert "access" not in payload and "password" not in payload
    assert payload["role"] == "student"
    assert payload["class_name"] == "6A"
    user = User.objects.get(username="an.nguyen")
    assert user.check_password(PASSWORD)
    assert user.phone == "0912345678"


def test_phone_and_email_are_optional(client):
    assert register(client).status_code == 201


@pytest.mark.parametrize("field", ["username", "password", "school_name", "class_name"])
def test_required_fields(client, field):
    response = register(client, **{field: ""})

    assert response.status_code == 400
    assert field in response.json()


def test_cannot_choose_a_role(client):
    register(client, role=Role.TEACHER)

    assert User.objects.get(username="an.nguyen").role == Role.STUDENT


def test_username_is_unique_ignoring_case(client):
    create_user("An.Nguyen")

    response = register(client)

    assert response.status_code == 400
    assert "username" in response.json()


def test_weak_password_is_rejected(client):
    response = register(client, password="123")

    assert response.status_code == 400
    assert "password" in response.json()


def test_malformed_phone_is_rejected(client):
    assert "phone" in register(client, phone="abc").json()


def test_login_after_register_then_read_profile(client):
    register(client)

    tokens = login(client).json()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    me = client.get(reverse("auth-me"))

    assert me.status_code == 200
    assert me.json()["username"] == "an.nguyen"
    assert me.json()["school_name"] == SIGN_UP["school_name"]


def test_wrong_password_is_rejected(client):
    register(client)

    assert login(client, password="wrong-password").status_code == 401


def test_me_requires_sign_in(client):
    assert client.get(reverse("auth-me")).status_code == 401


def test_logout_revokes_the_refresh_token(client):
    register(client)
    refresh = login(client).json()["refresh"]

    assert client.post(reverse("auth-logout"), {"refresh": refresh}).status_code == 205
    reused = client.post(reverse("token-refresh"), {"refresh": refresh})
    assert reused.status_code == 401


def test_logout_with_a_bad_token_still_succeeds(client):
    assert client.post(reverse("auth-logout"), {"refresh": "nope"}).status_code == 205


def test_login_is_throttled(client, monkeypatch):
    # Rates are read once when DRF loads, so patch the throttle rather than the settings.
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"auth": "2/min"})

    statuses = [login(client, password="x").status_code for _ in range(3)]

    assert statuses[-1] == 429


@pytest.fixture
def student(client):
    register(client, phone="0912345678")
    token = login(client).json()["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return User.objects.get(username="an.nguyen")


def test_profile_update_changes_allowed_fields_only(client, student):
    response = client.patch(
        reverse("auth-me"),
        {"class_name": " 7B ", "email": "an@example.com", "username": "hacker", "role": "teacher"},
        format="json",
    )

    assert response.status_code == 200
    student.refresh_from_db()
    assert (student.class_name, student.email) == ("7B", "an@example.com")
    assert (student.username, student.role) == ("an.nguyen", Role.STUDENT)


def test_student_cannot_clear_school_or_class(client, student):
    response = client.patch(reverse("auth-me"), {"school_name": "  "}, format="json")

    assert response.status_code == 400
    assert "school_name" in response.json()


def test_optional_fields_can_be_cleared(client, student):
    assert client.patch(reverse("auth-me"), {"phone": ""}, format="json").status_code == 200
    student.refresh_from_db()
    assert student.phone == ""


def test_put_is_not_allowed(client, student):
    assert client.put(reverse("auth-me"), {}, format="json").status_code == 405


def test_password_change_needs_the_current_password(client, student):
    url = reverse("auth-password-change")

    wrong = client.post(url, {"current_password": "nope", "new_password": "song-thach-han-9"})
    weak = client.post(url, {"current_password": PASSWORD, "new_password": "123"})
    ok = client.post(url, {"current_password": PASSWORD, "new_password": "song-thach-han-9"})

    assert "current_password" in wrong.json()
    assert "new_password" in weak.json()
    assert ok.status_code == 204
    client.credentials()
    assert login(client, password="song-thach-han-9").status_code == 200
    assert login(client).status_code == 401


def test_password_change_requires_sign_in(client):
    assert client.post(reverse("auth-password-change"), {}).status_code == 401
