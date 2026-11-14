import random

from rest_framework import serializers

from apps.archive.serializers import VillageRefSerializer
from apps.core.serializers import LessonRefSerializer, QuizRefSerializer

from .models import Choice, MatchPair, Question, Quiz, QuizAttempt
from .rules import CHOICE_KINDS, QuestionKind

# Nothing here may reveal an answer before grading: no ``is_correct``, no ``accepted_answers``,
# and matching right-hand items are bare, shuffled text.

MAX_TYPED_LENGTH = 300


class QuizListSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(read_only=True)
    lesson = LessonRefSerializer(read_only=True)
    villages = VillageRefSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "slug",
            "title",
            "description",
            "grade_level",
            "time_limit_minutes",
            "question_count",
            "lesson",
            "villages",
        ]


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text"]


class MatchLeftSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchPair
        fields = ["id", "left"]


class QuestionSerializer(serializers.ModelSerializer):
    choices = serializers.SerializerMethodField()
    left_items = serializers.SerializerMethodField()
    right_items = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "order",
            "kind",
            "prompt",
            "image_url",
            "points",
            "choices",
            "left_items",
            "right_items",
        ]

    def get_choices(self, question: Question) -> list[dict]:
        if question.kind not in CHOICE_KINDS:
            return []
        return ChoiceSerializer(question.choices.all(), many=True).data

    def get_left_items(self, question: Question) -> list[dict]:
        if question.kind != QuestionKind.MATCHING:
            return []
        return MatchLeftSerializer(question.pairs.all(), many=True).data

    def get_right_items(self, question: Question) -> list[str]:
        if question.kind != QuestionKind.MATCHING:
            return []
        rights = [pair.right for pair in question.pairs.all()]
        random.shuffle(rights)  # in list order they would line up with the left items
        return rights


class QuizDetailSerializer(QuizListSerializer):
    questions = serializers.SerializerMethodField()

    class Meta(QuizListSerializer.Meta):
        fields = [*QuizListSerializer.Meta.fields, "shuffle_questions", "questions"]

    def get_questions(self, quiz: Quiz) -> list[dict]:
        questions = list(quiz.questions.all())
        if quiz.shuffle_questions:
            random.shuffle(questions)
        return QuestionSerializer(questions, many=True).data


# --- submitting --------------------------------------------------------------------------


class QuizAnswerInputSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    choice = serializers.IntegerField(required=False)
    text = serializers.CharField(
        required=False, allow_blank=True, max_length=MAX_TYPED_LENGTH, trim_whitespace=False
    )
    matches = serializers.DictField(
        child=serializers.CharField(allow_blank=True, max_length=MAX_TYPED_LENGTH),
        required=False,
    )


class SubmitSerializer(serializers.Serializer):
    answers = QuizAnswerInputSerializer(many=True, allow_empty=True)
    duration_seconds = serializers.IntegerField(required=False, min_value=0, max_value=86_400)

    def validate_answers(self, answers: list[dict]) -> list[dict]:
        quiz: Quiz = self.context["quiz"]
        ids = [answer["question"] for answer in answers]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Each question can be answered only once.")
        unknown = set(ids) - set(quiz.questions.values_list("pk", flat=True))
        if unknown:
            raise serializers.ValidationError(
                f"These questions are not in this quiz: {sorted(unknown)}."
            )
        return answers

    def responses(self) -> dict[int, dict]:
        """Question id -> the answer without its ``question`` key, as grading expects it."""
        return {
            answer["question"]: {k: v for k, v in answer.items() if k != "question"}
            for answer in self.validated_data["answers"]
        }


class GradedAnswerSerializer(serializers.Serializer):
    question = serializers.IntegerField(source="question.pk")
    is_correct = serializers.BooleanField()
    points_awarded = serializers.IntegerField()
    points = serializers.IntegerField(source="question.points")
    solution = serializers.DictField()
    pair_results = serializers.DictField(child=serializers.BooleanField())
    explanation = serializers.CharField(source="question.explanation")


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz = QuizRefSerializer(read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ["id", "quiz", "score", "max_score", "duration_seconds", "submitted_at"]


# --- teacher: class results --------------------------------------------------------------


class ClassResultsQuerySerializer(serializers.Serializer):
    quiz = serializers.SlugField()
    school_name = serializers.CharField(max_length=200)
    class_name = serializers.CharField(max_length=20)


class StudentResultSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="student.pk")
    username = serializers.CharField(source="student.username")
    display_name = serializers.CharField(source="student.display_name")
    attempt_count = serializers.IntegerField()
    best_score = serializers.IntegerField(allow_null=True)
    last_score = serializers.IntegerField(allow_null=True)
    last_submitted_at = serializers.DateTimeField(allow_null=True)


class QuestionStatSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="question.pk")
    order = serializers.IntegerField(source="question.order")
    kind = serializers.CharField(source="question.kind")
    prompt = serializers.CharField(source="question.prompt")
    answered = serializers.IntegerField()
    correct = serializers.IntegerField()


class ClassResultsSerializer(serializers.Serializer):
    quiz = QuizRefSerializer()
    max_score = serializers.IntegerField()
    students = StudentResultSerializer(many=True)
    questions = QuestionStatSerializer(many=True)
