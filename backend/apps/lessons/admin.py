from django.contrib import admin
from django.db.models import Count, QuerySet
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _

from apps.core.admin import PublishableAdminMixin

from .models import Answer, Assignment, Feedback, Lesson, LessonDocument, LessonTask, Submission


class LessonDocumentInline(admin.TabularInline):
    model = LessonDocument
    fields = ["order", "document", "note"]
    autocomplete_fields = ["document"]
    extra = 1


class LessonTaskInline(admin.StackedInline):
    model = LessonTask
    fields = [("order", "kind"), "prompt", "hint"]
    extra = 1


@admin.register(Lesson)
class LessonAdmin(PublishableAdminMixin, admin.ModelAdmin):
    list_display = ["title", "subject", "grade", "author", "task_count", "status"]
    list_filter = ["status", "subject", "grade", "villages"]
    search_fields = ["title", "slug", "objectives", "introduction"]
    prepopulated_fields = {"slug": ["title"]}
    autocomplete_fields = ["villages", "author"]
    readonly_fields = ["created_at", "updated_at", "published_at"]
    inlines = [LessonDocumentInline, LessonTaskInline]
    fieldsets = [
        (None, {"fields": ["slug", "title", ("subject", "grade"), "author"]}),
        (_("Lesson plan"), {"fields": ["objectives", "introduction", "expected_output"]}),
        (_("Links"), {"fields": ["villages"]}),
        (_("Editorial"), {"fields": ["status"]}),
        (
            _("Timestamps"),
            {"fields": ["published_at", "created_at", "updated_at"], "classes": ["collapse"]},
        ),
    ]

    def get_queryset(self, request: HttpRequest) -> QuerySet[Lesson]:
        return (
            super()
            .get_queryset(request)
            .select_related("author")
            .annotate(task_count=Count("tasks", distinct=True))
        )

    def get_changeform_initial_data(self, request: HttpRequest) -> dict:
        # The teacher writing the lesson is its author unless they pick someone else.
        return super().get_changeform_initial_data(request) | {"author": request.user.pk}

    @admin.display(description=_("tasks"), ordering="task_count")
    def task_count(self, obj: Lesson) -> int:
        return obj.task_count


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ["lesson", "class_name", "school_name", "teacher", "due_at", "created_at"]
    list_filter = ["school_name", "class_name"]
    search_fields = ["lesson__title", "school_name", "class_name", "teacher__username"]
    autocomplete_fields = ["lesson", "teacher"]
    date_hierarchy = "created_at"


class AnswerInline(admin.StackedInline):
    model = Answer
    fields = ["task", "text"]
    readonly_fields = ["task", "text"]
    extra = 0
    can_delete = False


class FeedbackInline(admin.StackedInline):
    model = Feedback
    fields = ["teacher", "comment", "score"]
    autocomplete_fields = ["teacher"]
    extra = 0


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    """Students write in the app; the admin is for looking things up and fixing mistakes."""

    list_display = ["student", "assignment", "status", "submitted_at"]
    list_filter = ["status", "assignment__school_name", "assignment__class_name"]
    search_fields = ["student__username", "assignment__lesson__title"]
    readonly_fields = ["assignment", "student", "submitted_at", "created_at", "updated_at"]
    fields = ["assignment", "student", "status", "submitted_at", "created_at", "updated_at"]
    inlines = [AnswerInline, FeedbackInline]
    list_select_related = ["student", "assignment__lesson"]
