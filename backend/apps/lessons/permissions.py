from rest_framework.permissions import BasePermission


def is_teacher(user) -> bool:
    """Teachers give assignments; school admins (and superusers) may act as teachers."""
    return bool(user and user.is_authenticated and (user.is_teacher or user.is_school_admin))


class IsStudent(BasePermission):
    message = "Only students have assignments."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_student)


class IsTeacher(BasePermission):
    message = "Only teachers can give assignments."

    def has_permission(self, request, view) -> bool:
        return is_teacher(request.user)
