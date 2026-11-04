from apps.accounts.models import ClassMembership, Classroom, Role, School, User


def create_school(code: str = "thien-thanh", **fields) -> School:
    fields.setdefault("name", "Truong TH va THCS Thien Thanh")
    return School.objects.create(code=code, **fields)


def create_classroom(name: str = "6A", school: School | None = None, **fields) -> Classroom:
    fields.setdefault("grade", int("".join(c for c in name if c.isdigit()) or 6))
    fields.setdefault("school_year", "2026-2027")
    return Classroom.objects.create(name=name, school=school or create_school(), **fields)


def create_user(username: str = "an.nguyen", role: str = Role.STUDENT, **fields) -> User:
    return User.objects.create_user(username=username, password="s3cret-pass", role=role, **fields)


def enrol(user: User, classroom: Classroom, kind: str = ClassMembership.Kind.STUDENT):
    return ClassMembership.objects.create(user=user, classroom=classroom, kind=kind)
