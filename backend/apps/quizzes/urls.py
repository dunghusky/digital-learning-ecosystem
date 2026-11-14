from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MyQuizAttemptViewSet, QuizViewSet, TeacherQuizResultsView

router = DefaultRouter()
router.register("quizzes", QuizViewSet, basename="quiz")
router.register("quiz-attempts", MyQuizAttemptViewSet, basename="quiz-attempt")

urlpatterns = [
    path("teaching/quiz-results/", TeacherQuizResultsView.as_view(), name="teaching-quiz-results"),
    *router.urls,
]
