from rest_framework.routers import DefaultRouter

from .classwork_views import (
    StudentAssignmentViewSet,
    TeacherAssignmentViewSet,
    TeacherSubmissionViewSet,
)
from .views import LessonViewSet

router = DefaultRouter()
router.register("lessons", LessonViewSet, basename="lesson")
router.register("assignments", StudentAssignmentViewSet, basename="assignment")
router.register("teaching/assignments", TeacherAssignmentViewSet, basename="teaching-assignment")
router.register("teaching/submissions", TeacherSubmissionViewSet, basename="teaching-submission")

urlpatterns = router.urls
