"""Comparing what a student typed with the accepted answers.

Forgiving about what does not matter in a primary-school answer (case, extra spaces, a trailing
full stop, how the keyboard composed the accents) but strict about spelling: Vietnamese accents
change the meaning of a word, so "non" is not "nón".
"""

import re
import unicodedata
from collections.abc import Iterable

_SPACES = re.compile(r"\s+")
_EDGE_PUNCTUATION = ".,;:!?…\"'“”‘’()[]-–— "


def normalize_answer(text: str) -> str:
    # NFC first: some keyboards type "ó" as "o" + combining accent, which looks the same.
    text = unicodedata.normalize("NFC", text)
    text = _SPACES.sub(" ", text).strip(_EDGE_PUNCTUATION)
    return text.casefold()


def is_accepted(answer: str, accepted: Iterable[str]) -> bool:
    given = normalize_answer(answer)
    return bool(given) and any(given == normalize_answer(option) for option in accepted)
