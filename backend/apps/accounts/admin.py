from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import ClassMembership, Classroom, School, User


class MembershipInline(admin.TabularInline):
    model = ClassMembership
    extra = 0
    autocomplete_fields = ["classroom", "user"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        "username",
        "display_name",
        "role",
        "school_name",
        "class_name",
        "is_active",
    ]
    list_filter = ["role", "is_active", "is_staff"]
    search_fields = [*BaseUserAdmin.search_fields, "phone", "school_name", "class_name"]
    fieldsets = (
        *BaseUserAdmin.fieldsets,
        (_("School"), {"fields": ("role", "phone", "school_name", "class_name")}),
    )
    add_fieldsets = (
        *BaseUserAdmin.add_fieldsets,
        (_("School"), {"fields": ("role", "phone", "school_name", "class_name")}),
    )
    inlines = [MembershipInline]

    @admin.display(description=_("name"))
    def display_name(self, user: User) -> str:
        return user.get_full_name()


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "commune"]
    search_fields = ["name", "code"]
    prepopulated_fields = {"code": ["name"]}


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ["name", "grade", "school_year", "school", "student_count"]
    list_filter = ["school_year", "grade", "school"]
    search_fields = ["name"]
    inlines = [MembershipInline]

    @admin.display(description=_("students"))
    def student_count(self, classroom: Classroom) -> int:
        return classroom.memberships.filter(kind=ClassMembership.Kind.STUDENT).count()
