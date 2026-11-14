import unicodedata

import pytest
from django.core.exceptions import ValidationError

from apps.archive.models import Genre
from apps.archive.tests.factories import create_document
from apps.quizzes.answers import is_accepted, normalize_answer
from apps.quizzes.generation import fill_blank_question, riddle_question
from apps.quizzes.models import QuestionKind

pytestmark = pytest.mark.django_db

VERSE = "Ai về Bố Liêu\nMua nón lá bài thơ\nNón đẹp như mơ"


# --- comparing answers -----------------------------------------------------------------


@pytest.mark.parametrize(
    "typed",
    ["nón lá", "  Nón   Lá ", "NÓN LÁ.", "“nón lá”", unicodedata.normalize("NFD", "nón lá")],
)
def test_case_spaces_punctuation_and_key_composition_are_forgiven(typed):
    assert is_accepted(typed, ["Nón lá"])


@pytest.mark.parametrize("typed", ["non la", "nón", "", "   ", "."])
def test_accents_and_missing_words_are_not_forgiven(typed):
    assert not is_accepted(typed, ["Nón lá"])


def test_any_accepted_spelling_counts():
    assert is_accepted("cái nón", ["nón lá", "cái nón"])


def test_normalize_keeps_inner_punctuation():
    assert normalize_answer(" Bố-Liêu! ") == "bố-liêu"


# --- riddles ---------------------------------------------------------------------------


def test_riddle_question_takes_body_and_answer():
    riddle = create_document(
        "cau-do-non", genre=Genre.RIDDLE, body="Cái gì che nắng?\n", answer="Cái nón"
    )

    generated = riddle_question(riddle)

    assert generated.kind == QuestionKind.RIDDLE
    assert generated.prompt == "Cái gì che nắng?"
    assert generated.accepted_answers == "Cái nón"
    assert generated.document == riddle


def test_riddle_without_answer_or_other_genre_is_refused():
    with pytest.raises(ValidationError):
        riddle_question(create_document("cau-do", genre=Genre.RIDDLE, answer=""))
    with pytest.raises(ValidationError):
        riddle_question(create_document("ca-dao"))


# --- fill in the blank -----------------------------------------------------------------


def test_fill_blank_hides_the_word_and_keeps_its_spelling():
    verse = create_document("ai-ve", body=VERSE)

    generated = fill_blank_question(verse, "bài thơ")

    assert generated.kind == QuestionKind.FILL_BLANK
    assert generated.prompt == "Ai về Bố Liêu\nMua nón lá ___\nNón đẹp như mơ"
    assert generated.accepted_answers == "bài thơ"


def test_fill_blank_matches_case_insensitively_and_returns_source_case():
    verse = create_document("ai-ve", body=VERSE)
    assert fill_blank_question(verse, "bố liêu").accepted_answers == "Bố Liêu"


def test_fill_blank_only_hides_whole_words():
    verse = create_document("ai-ve", body="Nông dân đội nón")
    # "nón" is a whole word here; "nô" is only the start of "nông" and must not match.
    assert fill_blank_question(verse, "nón").prompt == "Nông dân đội ___"
    with pytest.raises(ValidationError):
        fill_blank_question(verse, "nô")


@pytest.mark.parametrize("hidden", ["nón", "không có", "  "])
def test_fill_blank_refuses_repeated_missing_or_empty_words(hidden):
    # "nón" appears twice in VERSE: the second copy would give the answer away.
    with pytest.raises(ValidationError):
        fill_blank_question(create_document("ai-ve", body=VERSE), hidden)


def test_fill_blank_refuses_prose():
    with pytest.raises(ValidationError):
        fill_blank_question(create_document("truyen", genre=Genre.LEGEND, body="Ngày xưa"), "xưa")
