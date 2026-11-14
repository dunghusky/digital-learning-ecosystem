import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.core.models import PublicationStatus
from apps.quizzes.models import Choice, QuestionKind
from apps.quizzes.rules import ChoiceRow, PairRow, choice_errors, pair_errors

from .factories import (
    create_choice_question,
    create_matching_question,
    create_question,
    create_quiz,
)

pytestmark = pytest.mark.django_db


def errors_of(question) -> dict:
    with pytest.raises(ValidationError) as error:
        question.full_clean()
    return error.value.message_dict


# --- question fields -------------------------------------------------------------------


@pytest.mark.parametrize("prompt", ["Non la lam o dau?", "___ va ___"])
def test_fill_blank_needs_exactly_one_blank(prompt):
    question = create_question(
        create_quiz(), kind=QuestionKind.FILL_BLANK, prompt=prompt, accepted_answers="non"
    )
    assert "prompt" in errors_of(question)


@pytest.mark.parametrize("kind", [QuestionKind.FILL_BLANK, QuestionKind.RIDDLE])
def test_typed_answer_kinds_need_an_answer(kind):
    question = create_question(create_quiz(), kind=kind, prompt="Ai ve ___", accepted_answers=" \n")
    assert "accepted_answers" in errors_of(question)


def test_choice_question_must_not_take_typed_answers():
    question = create_question(create_quiz(), accepted_answers="Quang Tri")
    assert "accepted_answers" in errors_of(question)


def test_picture_question_needs_an_image():
    question = create_question(create_quiz(), kind=QuestionKind.IMAGE_CHOICE)
    assert "image_url" in errors_of(question)


def test_answer_list_drops_blank_lines_and_spaces():
    question = create_question(
        create_quiz(), kind=QuestionKind.RIDDLE, accepted_answers=" cai non \n\nnon la\n"
    )
    question.full_clean()
    assert question.answer_list == ["cai non", "non la"]


@pytest.mark.parametrize("points", [0, 11])
def test_points_outside_1_to_10_are_rejected_by_the_database(points):
    with pytest.raises(IntegrityError), transaction.atomic():
        create_question(create_quiz(), points=points)


# --- rules on choices and pairs --------------------------------------------------------


def test_choice_rules():
    right, wrong = ChoiceRow("Quang Tri", True), ChoiceRow("Hue", False)
    kind = QuestionKind.SINGLE_CHOICE
    assert choice_errors(kind, [right, wrong]) == []
    assert choice_errors(kind, [right]) != []  # too few
    assert choice_errors(kind, [wrong, wrong]) != []  # none correct
    assert choice_errors(kind, [right, right]) != []  # two correct
    assert choice_errors(QuestionKind.IMAGE_CHOICE, [right, ChoiceRow(" quang tri", False)]) != []
    assert choice_errors(QuestionKind.RIDDLE, [right]) != []  # not a choice kind
    assert choice_errors(QuestionKind.RIDDLE, []) == []


def test_pair_rules():
    pairs = [PairRow("Tra Loc", "non la"), PairRow("Cua Viet", "nuoc mam")]
    assert pair_errors(QuestionKind.MATCHING, pairs) == []
    assert pair_errors(QuestionKind.MATCHING, pairs[:1]) != []
    assert pair_errors(QuestionKind.MATCHING, [pairs[0], PairRow("Cua Viet", "Non la")]) != []
    assert pair_errors(QuestionKind.SINGLE_CHOICE, pairs) != []


# --- publishing ------------------------------------------------------------------------


def test_quiz_without_questions_cannot_be_published():
    quiz = create_quiz()
    quiz.status = PublicationStatus.PUBLISHED
    with pytest.raises(ValidationError) as error:
        quiz.full_clean()
    assert "status" in error.value.message_dict


def test_quiz_with_an_incomplete_question_cannot_be_published():
    quiz = create_quiz()
    create_choice_question(quiz)
    broken = create_question(quiz)  # no choices
    quiz.status = PublicationStatus.PUBLISHED

    problems = quiz.publishing_problems()

    assert problems
    assert all(problem.startswith(f"Question {broken.order}") for problem in problems)
    with pytest.raises(ValidationError):
        quiz.full_clean()


def test_complete_quiz_publishes_and_gets_stamped():
    quiz = create_quiz()
    create_choice_question(quiz)
    create_matching_question(quiz)
    create_question(quiz, kind=QuestionKind.RIDDLE, prompt="Con gi?", accepted_answers="non")
    quiz.status = PublicationStatus.PUBLISHED

    quiz.full_clean()
    quiz.save()

    assert quiz.publishing_problems() == []
    assert quiz.published_at is not None


def test_deleting_a_quiz_removes_its_questions_and_choices():
    quiz = create_quiz()
    create_choice_question(quiz)
    quiz.delete()
    assert not Choice.objects.exists()
