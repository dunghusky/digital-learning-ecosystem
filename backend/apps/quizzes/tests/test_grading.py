import pytest

from apps.quizzes.grading import grade, grade_quiz
from apps.quizzes.models import QuestionKind

from .factories import (
    create_choice_question,
    create_matching_question,
    create_question,
    create_quiz,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def quiz():
    return create_quiz()


def correct_choice(question) -> int:
    return question.choices.get(is_correct=True).pk


def test_choice_is_right_only_with_the_correct_id(quiz):
    question = create_choice_question(quiz, points=3)
    right = correct_choice(question)
    wrong = question.choices.exclude(pk=right).get().pk

    assert grade(question, {"choice": right}).points_awarded == 3
    assert not grade(question, {"choice": wrong}).is_correct
    assert not grade(question, {"choice": str(right)}).is_correct  # ids are numbers
    assert grade(question, {}).solution == {"choice": right}


def test_typed_answer_uses_the_forgiving_comparison(quiz):
    question = create_question(
        quiz, kind=QuestionKind.RIDDLE, prompt="Cái gì?", accepted_answers="Cái nón\nnón lá"
    )

    assert grade(question, {"text": "  NÓN LÁ. "}).is_correct
    assert not grade(question, {"text": "non la"}).is_correct
    assert grade(question, {"text": 42}).is_correct is False
    assert grade(question, {}).solution == {"answers": ["Cái nón", "nón lá"]}


def test_matching_is_all_or_nothing_but_reports_each_pair(quiz):
    question = create_matching_question(quiz)
    tra_loc, cua_viet = (str(pair.pk) for pair in question.pairs.all())

    all_right = grade(question, {"matches": {tra_loc: "Non La", cua_viet: "nuoc mam"}})
    one_wrong = grade(question, {"matches": {tra_loc: "non la", cua_viet: "non la"}})

    assert all_right.is_correct and all_right.points_awarded == 1
    assert not one_wrong.is_correct and one_wrong.points_awarded == 0
    assert one_wrong.pair_results == {tra_loc: True, cua_viet: False}
    assert one_wrong.solution == {"matches": {tra_loc: "non la", cua_viet: "nuoc mam"}}


def test_skipped_questions_score_zero_and_count_towards_the_maximum(quiz):
    first = create_choice_question(quiz, points=2)
    create_question(quiz, kind=QuestionKind.RIDDLE, prompt="?", accepted_answers="nón", points=3)

    graded = grade_quiz(quiz.questions.all(), {first.pk: {"choice": correct_choice(first)}})

    assert (graded.score, graded.max_score) == (2, 5)
