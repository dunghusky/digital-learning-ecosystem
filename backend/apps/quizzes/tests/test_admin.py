import pytest

from apps.archive.models import Genre
from apps.archive.tests.factories import create_document
from apps.core.models import PublicationStatus
from apps.quizzes.models import Question, QuestionKind, Quiz

from .factories import create_choice_question, create_question, create_quiz

pytestmark = pytest.mark.django_db


@pytest.fixture
def editor_client(client, django_user_model):
    django_user_model.objects.create_superuser("teacher", password="pw")
    client.login(username="teacher", password="pw")
    return client


def inline_data(prefix: str, rows: list[dict]) -> dict:
    data = {
        f"{prefix}-TOTAL_FORMS": str(len(rows)),
        f"{prefix}-INITIAL_FORMS": "0",
        f"{prefix}-MIN_NUM_FORMS": "0",
        f"{prefix}-MAX_NUM_FORMS": "1000",
    }
    for index, row in enumerate(rows):
        data |= {f"{prefix}-{index}-{key}": value for key, value in row.items()}
    return data


def question_post(quiz: Quiz, kind: str, choices=(), pairs=()) -> dict:
    return (
        {"quiz": quiz.pk, "order": 1, "kind": kind, "points": 1, "prompt": "Non la o dau?"}
        | inline_data("choices", list(choices))
        | inline_data("pairs", list(pairs))
    )


def test_changelist_shows_question_count(editor_client):
    quiz = create_quiz()
    create_choice_question(quiz)

    response = editor_client.get("/admin/quizzes/quiz/")

    assert response.status_code == 200
    assert response.context["cl"].result_list[0].question_count == 1


def test_change_form_lists_what_blocks_publishing(editor_client):
    quiz = create_quiz()
    create_question(quiz)  # no choices yet

    response = editor_client.get(f"/admin/quizzes/quiz/{quiz.pk}/change/")

    assert response.status_code == 200
    assert "Mark exactly one choice as correct." in response.content.decode()


def test_question_with_one_correct_choice_saves(editor_client):
    quiz = create_quiz()
    choices = [
        {"order": 1, "text": "Quang Tri", "is_correct": "on"},
        {"order": 2, "text": "Ha Noi"},
    ]

    response = editor_client.post(
        "/admin/quizzes/question/add/",
        question_post(quiz, QuestionKind.SINGLE_CHOICE, choices=choices),
    )

    assert response.status_code == 302
    assert Question.objects.get().choices.count() == 2


def test_question_without_a_correct_choice_is_refused(editor_client):
    quiz = create_quiz()
    choices = [{"order": 1, "text": "Quang Tri"}, {"order": 2, "text": "Ha Noi"}]

    response = editor_client.post(
        "/admin/quizzes/question/add/",
        question_post(quiz, QuestionKind.SINGLE_CHOICE, choices=choices),
    )

    assert response.status_code == 200
    assert not Question.objects.exists()


def test_choices_on_a_matching_question_are_refused(editor_client):
    quiz = create_quiz()
    pairs = [
        {"order": 1, "left": "Tra Loc", "right": "non la"},
        {"order": 2, "left": "Cua Viet", "right": "nuoc mam"},
    ]

    response = editor_client.post(
        "/admin/quizzes/question/add/",
        question_post(
            quiz, QuestionKind.MATCHING, choices=[{"order": 1, "text": "x"}], pairs=pairs
        ),
    )

    assert response.status_code == 200
    assert not Question.objects.exists()


def test_riddle_question_is_filled_from_its_document(editor_client):
    quiz = create_quiz()
    riddle = create_document("cau-do", genre=Genre.RIDDLE, body="Cái gì?", answer="Cái nón")
    data = question_post(quiz, QuestionKind.RIDDLE) | {"prompt": "", "document": riddle.pk}

    response = editor_client.post("/admin/quizzes/question/add/", data)

    assert response.status_code == 302
    question = Question.objects.get()
    assert (question.prompt, question.answer_list) == ("Cái gì?", ["Cái nón"])


def test_fill_blank_question_hides_the_chosen_word(editor_client):
    quiz = create_quiz()
    verse = create_document("ai-ve", body="Ai về Bố Liêu\nMua nón lá")
    data = question_post(quiz, QuestionKind.FILL_BLANK) | {
        "prompt": "",
        "document": verse.pk,
        "hidden_word": "nón lá",
    }

    response = editor_client.post("/admin/quizzes/question/add/", data)

    assert response.status_code == 302
    question = Question.objects.get()
    assert question.prompt == "Ai về Bố Liêu\nMua ___"
    assert question.answer_list == ["nón lá"]


def test_fill_blank_with_a_word_not_in_the_verse_is_refused(editor_client):
    quiz = create_quiz()
    verse = create_document("ai-ve", body="Ai về Bố Liêu")
    data = question_post(quiz, QuestionKind.FILL_BLANK) | {
        "prompt": "",
        "document": verse.pk,
        "hidden_word": "nón",
    }

    response = editor_client.post("/admin/quizzes/question/add/", data)

    assert response.status_code == 200
    assert "hidden_word" in response.context["adminform"].form.errors
    assert not Question.objects.exists()


def test_teacher_prompt_is_never_overwritten(editor_client):
    quiz = create_quiz()
    riddle = create_document("cau-do", genre=Genre.RIDDLE, body="Cái gì?", answer="Cái nón")
    data = question_post(quiz, QuestionKind.RIDDLE) | {
        "prompt": "Đố em: cái gì che nắng?",
        "document": riddle.pk,
        "accepted_answers": "nón",
    }

    editor_client.post("/admin/quizzes/question/add/", data)

    assert Question.objects.get().prompt == "Đố em: cái gì che nắng?"


def test_question_needs_a_prompt_or_a_document(editor_client):
    data = question_post(create_quiz(), QuestionKind.RIDDLE) | {"prompt": ""}

    response = editor_client.post("/admin/quizzes/question/add/", data)

    assert response.status_code == 200
    assert "prompt" in response.context["adminform"].form.errors


def test_add_riddles_page_lists_only_unused_published_riddles(editor_client):
    quiz = create_quiz()
    used = create_document("da-dung", genre=Genre.RIDDLE, answer="nón")
    create_question(quiz, kind=QuestionKind.RIDDLE, accepted_answers="nón", document=used)
    fresh = create_document("moi", genre=Genre.RIDDLE, answer="cối")
    create_document("nhap", genre=Genre.RIDDLE, answer="chổi", status=PublicationStatus.DRAFT)
    create_document("khong-dap-an", genre=Genre.RIDDLE, answer="")

    response = editor_client.get(f"/admin/quizzes/quiz/{quiz.pk}/add-riddles/")

    assert response.status_code == 200
    assert list(response.context["form"].fields["documents"].queryset) == [fresh]


def test_add_riddles_appends_questions_after_the_last_one(editor_client):
    quiz = create_quiz()
    create_choice_question(quiz, order=5)
    first = create_document("a-cau-do", genre=Genre.RIDDLE, body="Đố 1", answer="nón")
    second = create_document("b-cau-do", genre=Genre.RIDDLE, body="Đố 2", answer="cối")

    response = editor_client.post(
        f"/admin/quizzes/quiz/{quiz.pk}/add-riddles/", {"documents": [first.pk, second.pk]}
    )

    assert response.status_code == 302
    riddles = quiz.questions.filter(kind=QuestionKind.RIDDLE).order_by("order")
    assert [(q.order, q.prompt, q.answer_list) for q in riddles] == [
        (6, "Đố 1", ["nón"]),
        (7, "Đố 2", ["cối"]),
    ]


def test_bulk_publish_skips_incomplete_quizzes(editor_client):
    ready, empty = create_quiz("ready"), create_quiz("empty")
    create_choice_question(ready)

    editor_client.post(
        "/admin/quizzes/quiz/",
        {"action": "publish_selected", "_selected_action": [ready.pk, empty.pk]},
    )

    ready.refresh_from_db()
    empty.refresh_from_db()
    assert ready.status == PublicationStatus.PUBLISHED
    assert empty.status == PublicationStatus.DRAFT
