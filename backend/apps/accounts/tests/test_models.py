import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.accounts.models import ClassMembership, Role, User

from .factories import create_classroom, create_school, create_user, enrol

pytestmark = pytest.mark.django_db


def test_new_users_are_students():
    user = create_user()

    assert user.role == Role.STUDENT
    assert user.is_student


@pytest.mark.parametrize("phone", ["0912345678", "+84912345678"])
def test_phone_accepts_local_and_international_numbers(phone):
    create_user(phone=phone).full_clean()


@pytest.mark.parametrize("phone", ["12345", "09 1234 5678", "abc0912345678"])
def test_phone_rejects_malformed_numbers(phone):
    with pytest.raises(ValidationError):
        create_user(phone=phone).full_clean()


def test_superuser_counts_as_school_admin():
    admin = User.objects.create_superuser("root", password="x")

    assert admin.is_school_admin


def test_display_name_falls_back_to_username():
    assert create_user("binh").display_name == "binh"
    assert create_user("chi", first_name="Chi", last_name="Le").display_name == "Chi Le"


def test_classroom_name_is_unique_per_school_and_year():
    school = create_school()
    create_classroom("6A", school=school)
    create_classroom("6A", school=school, school_year="2027-2028")

    with pytest.raises(IntegrityError):
        create_classroom("6A", school=school)


def test_classroom_grade_must_be_1_to_9():
    with pytest.raises(IntegrityError):
        create_classroom("10A", grade=10)


def test_user_joins_a_classroom_once():
    classroom = create_classroom()
    student = create_user()
    enrol(student, classroom)

    assert list(student.classrooms.all()) == [classroom]
    with pytest.raises(IntegrityError):
        enrol(student, classroom, kind=ClassMembership.Kind.TEACHER)


def test_primary_classroom():
    school = create_school()

    assert create_classroom("3B", school=school).is_primary
    assert not create_classroom("7C", school=school).is_primary
