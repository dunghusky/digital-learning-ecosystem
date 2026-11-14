"""Grading a submitted quiz on the server, so the answers never reach the browser beforehand.

What a student sends for each kind of question (``response``):

- multiple choice / picture: ``{"choice": <choice id>}``
- fill in the blank / riddle: ``{"text": "<what they typed>"}``
- matching: ``{"matches": {"<pair id>": "<right-hand text they picked>"}}`` — right-hand items
  are sent as plain text, so their ids cannot leak which left item they belong to.

A question is all-or-nothing: a matching question scores only when every pair is right, but
the result still says which pairs were right so the student can see what to fix.
"""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field

from .answers import is_accepted, normalize_answer
from .models import Question
from .rules import CHOICE_KINDS, TYPED_ANSWER_KINDS, QuestionKind


@dataclass(frozen=True)
class GradedAnswer:
    question: Question
    response: dict
    is_correct: bool
    solution: dict
    # Matching only: pair id -> whether the student matched it correctly.
    pair_results: dict[str, bool] = field(default_factory=dict)

    @property
    def points_awarded(self) -> int:
        return self.question.points if self.is_correct else 0


@dataclass(frozen=True)
class GradedQuiz:
    answers: list[GradedAnswer]

    @property
    def score(self) -> int:
        return sum(answer.points_awarded for answer in self.answers)

    @property
    def max_score(self) -> int:
        return sum(answer.question.points for answer in self.answers)


def grade_quiz(questions: Iterable[Question], responses: Mapping[int, dict]) -> GradedQuiz:
    """Grade every question; one the student skipped is simply wrong.

    ``questions`` should come with ``choices`` and ``pairs`` prefetched.
    """
    return GradedQuiz([grade(q, responses.get(q.pk) or {}) for q in questions])


def grade(question: Question, response: dict) -> GradedAnswer:
    if question.kind in CHOICE_KINDS:
        return _grade_choice(question, response)
    if question.kind in TYPED_ANSWER_KINDS:
        return _grade_typed(question, response)
    if question.kind == QuestionKind.MATCHING:
        return _grade_matching(question, response)
    raise ValueError(f"Unknown question kind: {question.kind}")


def _grade_choice(question: Question, response: dict) -> GradedAnswer:
    correct = next((c.pk for c in question.choices.all() if c.is_correct), None)
    return GradedAnswer(
        question=question,
        response=response,
        is_correct=correct is not None and response.get("choice") == correct,
        solution={"choice": correct},
    )


def _grade_typed(question: Question, response: dict) -> GradedAnswer:
    accepted = question.answer_list
    return GradedAnswer(
        question=question,
        response=response,
        is_correct=is_accepted(str(response.get("text", "")), accepted),
        solution={"answers": accepted},
    )


def _grade_matching(question: Question, response: dict) -> GradedAnswer:
    pairs = list(question.pairs.all())
    given = response.get("matches") or {}
    pair_results = {
        str(pair.pk): normalize_answer(str(given.get(str(pair.pk), "")))
        == normalize_answer(pair.right)
        for pair in pairs
    }
    return GradedAnswer(
        question=question,
        response=response,
        is_correct=bool(pairs) and all(pair_results.values()),
        solution={"matches": {str(pair.pk): pair.right for pair in pairs}},
        pair_results=pair_results,
    )
