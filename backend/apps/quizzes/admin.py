from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Count, Max, QuerySet
from django.forms.models import BaseInlineFormSet
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html, format_html_join
from django.utils.translation import gettext_lazy as _
from django.utils.translation import ngettext

from apps.archive.models import Document, Genre
from apps.core.admin import PublishableAdminMixin

from .generation import GeneratedQuestion, fill_blank_question, riddle_question
from .models import AttemptAnswer, Choice, MatchPair, Question, Quiz, QuizAttempt
from .rules import ChoiceRow, PairRow, QuestionKind, choice_errors, pair_errors


class QuestionInline(admin.TabularInline):
    """Overview inside the quiz; choices and pairs are edited on the question's own page."""

    model = Question
    fields = ["order", "kind", "prompt", "accepted_answers", "points"]
    show_change_link = True
    extra = 1


@admin.register(Quiz)
class QuizAdmin(PublishableAdminMixin, admin.ModelAdmin):
    list_display = ["title", "grade_level", "lesson", "question_count", "status"]
    list_filter = ["status", "grade_level", "villages"]
    search_fields = ["title", "slug", "description"]
    prepopulated_fields = {"slug": ["title"]}
    autocomplete_fields = ["lesson", "villages", "author"]
    readonly_fields = ["checklist", "archive_tools", "created_at", "updated_at", "published_at"]
    inlines = [QuestionInline]
    fieldsets = [
        (None, {"fields": ["slug", "title", "description", "grade_level", "author"]}),
        (_("Settings"), {"fields": ["time_limit_minutes", "shuffle_questions"]}),
        (_("Links"), {"fields": ["lesson", "villages"]}),
        (_("Questions from the archive"), {"fields": ["archive_tools"]}),
        (_("Editorial"), {"fields": ["checklist", "status"]}),
        (
            _("Timestamps"),
            {"fields": ["published_at", "created_at", "updated_at"], "classes": ["collapse"]},
        ),
    ]

    def get_queryset(self, request: HttpRequest) -> QuerySet[Quiz]:
        return (
            super()
            .get_queryset(request)
            .select_related("lesson")
            .annotate(question_count=Count("questions", distinct=True))
        )

    def get_changeform_initial_data(self, request: HttpRequest) -> dict:
        return super().get_changeform_initial_data(request) | {"author": request.user.pk}

    @admin.display(description=_("questions"), ordering="question_count")
    def question_count(self, obj: Quiz) -> int:
        return obj.question_count

    @admin.display(description=_("ready to publish?"))
    def checklist(self, obj: Quiz) -> str:
        if not obj.pk:
            return _("Save the quiz, then add questions.")
        problems = obj.publishing_problems()
        if not problems:
            return _("Yes, every question is complete.")
        return format_html_join("", "<div>• {}</div>", ((problem,) for problem in problems))

    @admin.display(description=_("add from the archive"))
    def archive_tools(self, obj: Quiz) -> str:
        if not obj.pk:
            return _("Save the quiz first.")
        return format_html(
            '<a class="button" href="{}">{}</a>&nbsp; {}',
            reverse("admin:quizzes_quiz_add_riddles", args=[obj.pk]),
            _("Add riddles"),
            _("For a fill-in-the-blank verse, add a question and pick its source document."),
        )

    def get_urls(self):
        view = self.admin_site.admin_view(self.add_riddles_view)
        return [
            path("<int:pk>/add-riddles/", view, name="quizzes_quiz_add_riddles"),
            *super().get_urls(),
        ]

    def add_riddles_view(self, request: HttpRequest, pk: int) -> HttpResponse:
        """Pick published riddles from the archive; each becomes a riddle question."""
        quiz = get_object_or_404(Quiz, pk=pk)
        if not self.has_change_permission(request, quiz):
            raise PermissionDenied
        form = AddRiddlesForm(request.POST or None, quiz=quiz)
        if request.method == "POST" and form.is_valid():
            added = add_riddles(quiz, form.cleaned_data["documents"])
            message = ngettext("Added %(count)d riddle.", "Added %(count)d riddles.", added)
            self.message_user(request, message % {"count": added}, messages.SUCCESS)
            return redirect("admin:quizzes_quiz_change", quiz.pk)
        context = self.admin_site.each_context(request) | {
            "title": _("Add riddles to “%(quiz)s”") % {"quiz": quiz},
            "quiz": quiz,
            "form": form,
            "opts": self.opts,
        }
        return TemplateResponse(request, "admin/quizzes/quiz/add_riddles.html", context)


class AddRiddlesForm(forms.Form):
    documents = forms.ModelMultipleChoiceField(
        queryset=Document.objects.none(),
        widget=forms.CheckboxSelectMultiple,
        label=_("Riddles"),
    )

    def __init__(self, *args, quiz: Quiz, **kwargs):
        super().__init__(*args, **kwargs)
        # Published riddles with an answer that this quiz does not ask yet.
        self.fields["documents"].queryset = (
            Document.objects.published()
            .filter(genre=Genre.RIDDLE)
            .exclude(answer="")
            .exclude(quiz_questions__quiz=quiz)
            .order_by("title")
        )


@transaction.atomic
def add_riddles(quiz: Quiz, documents: QuerySet[Document]) -> int:
    last = quiz.questions.aggregate(last=Max("order"))["last"] or 0
    questions = Question.objects.bulk_create(
        Question(quiz=quiz, order=last + index, **riddle_question(document).as_fields())
        for index, document in enumerate(documents, start=1)
    )
    return len(questions)


class _PartsFormSet(BaseInlineFormSet):
    """Runs a ``rules`` check on the rows the teacher is about to save."""

    def kept_rows(self) -> list[dict]:
        return [
            form.cleaned_data
            for form in self.forms
            if form.cleaned_data and not form.cleaned_data.get("DELETE")
        ]

    def errors_for(self, kind: str) -> list[str]:
        raise NotImplementedError

    def clean(self) -> None:
        super().clean()
        if any(self.errors):
            return
        # The admin binds inlines to the question built from the submitted form, so
        # ``instance.kind`` is the kind being saved, not the one stored before.
        errors = self.errors_for(self.instance.kind)
        if errors:
            raise ValidationError(errors)


class ChoiceFormSet(_PartsFormSet):
    def errors_for(self, kind: str) -> list[str]:
        rows = [ChoiceRow(row["text"], row.get("is_correct", False)) for row in self.kept_rows()]
        return choice_errors(kind, rows)


class PairFormSet(_PartsFormSet):
    def errors_for(self, kind: str) -> list[str]:
        return pair_errors(kind, [PairRow(row["left"], row["right"]) for row in self.kept_rows()])


class ChoiceInline(admin.TabularInline):
    model = Choice
    formset = ChoiceFormSet
    fields = ["order", "text", "is_correct"]
    extra = 4


class MatchPairInline(admin.TabularInline):
    model = MatchPair
    formset = PairFormSet
    fields = ["order", "left", "right"]
    extra = 4


class QuestionAdminForm(forms.ModelForm):
    """Builds a question from its source document instead of the teacher retyping it.

    Riddle + document: prompt and answer come from the riddle. Fill in the blank + document +
    word to hide: the verse becomes the prompt with that word blanked out. Only an empty prompt
    is filled, so the teacher's own wording is never overwritten.
    """

    hidden_word = forms.CharField(
        label=_("word to hide"),
        required=False,
        help_text=_(
            "Fill in the blank: pick the source document, leave the prompt empty and type the "
            "word or phrase to hide."
        ),
    )

    class Meta:
        model = Question
        fields = [
            "quiz",
            "order",
            "kind",
            "points",
            "document",
            "prompt",
            "image_url",
            "accepted_answers",
            "explanation",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["prompt"].required = False

    def clean(self) -> dict:
        data = super().clean()
        document, kind = data.get("document"), data.get("kind")
        if document and not data.get("prompt", "").strip():
            try:
                generated = self._generate(document, kind, data.get("hidden_word", ""))
            except ValidationError as error:
                field = "hidden_word" if kind == QuestionKind.FILL_BLANK else "document"
                self.add_error(field, error)
                return data
            if generated:
                data |= generated.as_fields()
        if not data.get("prompt", "").strip() and "prompt" not in self.errors:
            self.add_error("prompt", _("Write the question, or pick a source document."))
        return data

    @staticmethod
    def _generate(document: Document, kind: str, hidden_word: str) -> GeneratedQuestion | None:
        if kind == QuestionKind.RIDDLE:
            return riddle_question(document)
        if kind == QuestionKind.FILL_BLANK:
            return fill_blank_question(document, hidden_word)
        return None


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    form = QuestionAdminForm
    list_display = ["__str__", "kind", "points", "document"]
    list_filter = ["kind", "quiz"]
    search_fields = ["prompt", "quiz__title"]
    autocomplete_fields = ["quiz", "document"]
    list_select_related = ["quiz", "document"]
    inlines = [ChoiceInline, MatchPairInline]
    fieldsets = [
        (None, {"fields": ["quiz", ("order", "kind", "points"), "document", "hidden_word"]}),
        (None, {"fields": ["prompt", "image_url"]}),
        (_("Typed answers"), {"fields": ["accepted_answers"]}),
        (_("After answering"), {"fields": ["explanation"]}),
    ]


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    fields = ["question", "response", "is_correct", "points_awarded"]
    readonly_fields = fields
    extra = 0
    can_delete = False


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    """Students take quizzes in the app; the admin is only for looking results up."""

    list_display = ["student", "quiz", "score", "max_score", "submitted_at"]
    list_filter = ["quiz", "student__school_name", "student__class_name"]
    search_fields = ["student__username", "quiz__title"]
    list_select_related = ["student", "quiz"]
    date_hierarchy = "submitted_at"
    readonly_fields = ["quiz", "student", "score", "max_score", "duration_seconds", "submitted_at"]
    fields = readonly_fields
    inlines = [AttemptAnswerInline]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False
