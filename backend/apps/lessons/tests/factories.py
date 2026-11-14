from apps.core.models import PublicationStatus
from apps.lessons.models import Lesson, LessonTask, Subject, TaskKind


def create_lesson(slug: str = "non-la-tra-loc", **overrides) -> Lesson:
    """Minimal published grade 7 literature lesson; pass overrides for what the test needs."""
    values = {
        "title": "Non la Tra Loc",
        "subject": Subject.LITERATURE,
        "grade": 7,
        "status": PublicationStatus.PUBLISHED,
    }
    return Lesson.objects.create(slug=slug, **(values | overrides))


def create_task(lesson: Lesson, order: int = 1, **overrides) -> LessonTask:
    values = {"kind": TaskKind.READING, "prompt": "Bai ca dao noi ve nghe gi?"}
    return LessonTask.objects.create(lesson=lesson, order=order, **(values | overrides))
