from apps.core.models import PublicationStatus
from apps.quizzes.models import Choice, MatchPair, Question, QuestionKind, Quiz


def create_quiz(slug: str = "do-vui-non-la", **overrides) -> Quiz:
    """Draft quiz with no questions; publish it in the test once it has some."""
    values = {"title": "Do vui non la", "status": PublicationStatus.DRAFT}
    return Quiz.objects.create(slug=slug, **(values | overrides))


def create_question(quiz: Quiz, kind: str = QuestionKind.SINGLE_CHOICE, **overrides) -> Question:
    values = {"order": quiz.questions.count() + 1, "prompt": "Non la Tra Loc lam o dau?"}
    return Question.objects.create(quiz=quiz, kind=kind, **(values | overrides))


def create_choice_question(quiz: Quiz, **overrides) -> Question:
    """Complete multiple-choice question: 'Quang Tri' is correct."""
    question = create_question(quiz, **overrides)
    Choice.objects.create(question=question, order=1, text="Quang Tri", is_correct=True)
    Choice.objects.create(question=question, order=2, text="Ha Noi")
    return question


def create_matching_question(quiz: Quiz) -> Question:
    question = create_question(quiz, kind=QuestionKind.MATCHING, prompt="Noi lang voi nghe")
    MatchPair.objects.create(question=question, order=1, left="Tra Loc", right="non la")
    MatchPair.objects.create(question=question, order=2, left="Cua Viet", right="nuoc mam")
    return question
