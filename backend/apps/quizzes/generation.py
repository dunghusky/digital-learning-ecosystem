"""Turning archive documents into quiz questions.

Functions return field values, not saved rows, so the admin form can fill a question the teacher
is still editing and the bulk tool can save many at once.
"""

import re
import unicodedata
from dataclasses import dataclass

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

from apps.archive.models import Document, Genre

from .rules import BLANK, QuestionKind

# Genres short enough to quote whole as a fill-in-the-blank prompt.
VERSE_GENRES = frozenset(
    {Genre.FOLK_VERSE, Genre.PROVERB, Genre.WORK_SONG, Genre.NURSERY_RHYME, Genre.POEM}
)


@dataclass(frozen=True)
class GeneratedQuestion:
    kind: str
    prompt: str
    accepted_answers: str
    document: Document

    def as_fields(self) -> dict:
        return {
            "kind": self.kind,
            "prompt": self.prompt,
            "accepted_answers": self.accepted_answers,
            "document": self.document,
        }


def riddle_question(document: Document) -> GeneratedQuestion:
    if document.genre != Genre.RIDDLE or not document.answer.strip():
        raise ValidationError(_("Only riddles that have an answer can become riddle questions."))
    return GeneratedQuestion(
        kind=QuestionKind.RIDDLE,
        prompt=document.body.strip(),
        accepted_answers=document.answer.strip(),
        document=document,
    )


def fill_blank_question(document: Document, hidden: str) -> GeneratedQuestion:
    """Hide ``hidden`` (a word or phrase that appears exactly once) in the document's text."""
    if document.genre not in VERSE_GENRES:
        raise ValidationError(_("Fill in the blank works with folk verse, proverbs and poems."))
    hidden = unicodedata.normalize("NFC", hidden.strip())
    body = unicodedata.normalize("NFC", document.body.strip())
    if not hidden:
        raise ValidationError(_("Type the word to hide."))
    # Whole words only: hiding "non" must not cut "nong" in half.
    pattern = re.compile(rf"(?<!\w){re.escape(hidden)}(?!\w)", flags=re.IGNORECASE)
    matches = list(pattern.finditer(body))
    names = {"word": hidden, "title": document.title}
    if not matches:
        raise ValidationError(_("“%(word)s” is not in the text of “%(title)s”.") % names)
    if len(matches) > 1:
        # A second, visible copy would give the answer away.
        raise ValidationError(
            _("“%(word)s” appears more than once in “%(title)s”; hide a longer phrase.") % names
        )
    match = matches[0]
    return GeneratedQuestion(
        kind=QuestionKind.FILL_BLANK,
        prompt=f"{body[: match.start()]}{BLANK}{body[match.end() :]}",
        accepted_answers=match.group(0),  # as written in the source, e.g. "Nón" at line start
        document=document,
    )
