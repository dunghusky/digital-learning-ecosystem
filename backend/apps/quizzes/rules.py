"""What a complete question of each kind needs.

Kept apart from the models so the same rules check unsaved admin inline rows (the teacher is
still editing) and saved rows (an editor publishes the quiz).
"""

from collections.abc import Sequence
from dataclasses import dataclass

from django.db import models
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy

BLANK = "___"
MIN_CHOICES = 2
MAX_CHOICES = 6
MIN_PAIRS = 2
MAX_PAIRS = 8


class QuestionKind(models.TextChoices):
    SINGLE_CHOICE = "single_choice", gettext_lazy("Multiple choice")
    IMAGE_CHOICE = "image_choice", gettext_lazy("Guess from a picture")
    FILL_BLANK = "fill_blank", gettext_lazy("Fill in the blank")
    RIDDLE = "riddle", gettext_lazy("Riddle")
    MATCHING = "matching", gettext_lazy("Matching pairs")


CHOICE_KINDS = frozenset({QuestionKind.SINGLE_CHOICE, QuestionKind.IMAGE_CHOICE})
TYPED_ANSWER_KINDS = frozenset({QuestionKind.FILL_BLANK, QuestionKind.RIDDLE})


@dataclass(frozen=True)
class ChoiceRow:
    text: str
    is_correct: bool


@dataclass(frozen=True)
class PairRow:
    left: str
    right: str


def choice_errors(kind: str, choices: Sequence[ChoiceRow]) -> list[str]:
    if kind not in CHOICE_KINDS:
        return [_("Only multiple-choice questions have choices.")] if choices else []
    errors = []
    if not MIN_CHOICES <= len(choices) <= MAX_CHOICES:
        errors.append(
            _("Give between %(min)d and %(max)d choices.")
            % {"min": MIN_CHOICES, "max": MAX_CHOICES}
        )
    if sum(choice.is_correct for choice in choices) != 1:
        errors.append(_("Mark exactly one choice as correct."))
    if _has_duplicates(choice.text for choice in choices):
        errors.append(_("Two choices have the same text."))
    return errors


def pair_errors(kind: str, pairs: Sequence[PairRow]) -> list[str]:
    if kind != QuestionKind.MATCHING:
        return [_("Only matching questions have pairs.")] if pairs else []
    errors = []
    if not MIN_PAIRS <= len(pairs) <= MAX_PAIRS:
        errors.append(
            _("Give between %(min)d and %(max)d pairs.") % {"min": MIN_PAIRS, "max": MAX_PAIRS}
        )
    # Students match by picking a right-hand item; duplicates would make two answers correct.
    if _has_duplicates(pair.left for pair in pairs) or _has_duplicates(
        pair.right for pair in pairs
    ):
        errors.append(_("Each side of the pairs must be unique."))
    return errors


def _has_duplicates(texts) -> bool:
    seen = [text.strip().casefold() for text in texts]
    return len(seen) != len(set(seen))
