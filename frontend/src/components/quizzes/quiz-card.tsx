import { ArrowRight, BookOpen, Clock, ListChecks, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { QuizSummary } from "@/lib/api/quizzes";

export function QuizCard({ quiz }: { quiz: QuizSummary }) {
  const t = useTranslations();

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      {/* A soft gold glow in the corner, like a prize waiting at the end. */}
      <span
        className="absolute -top-10 -right-10 size-28 rounded-full bg-gold-soft transition duration-500 group-hover:scale-125"
        aria-hidden
      />
      <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
        <Sparkles className="size-4" aria-hidden />
        {t(`gradeLevel.${quiz.grade_level}`)}
      </span>
      <h3 className="relative mt-3 text-lg leading-snug font-bold text-ink transition group-hover:text-primary">
        <Link
          href={`/quizzes/${quiz.slug}`}
          className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
        >
          {quiz.title}
        </Link>
      </h3>
      {quiz.description && (
        <p className="relative mt-2 line-clamp-2 text-sm text-ink-muted">{quiz.description}</p>
      )}

      <div className="relative mt-auto pt-5 text-sm text-ink-muted">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-4" aria-hidden />
            {t("quizzes.questionCount", { count: quiz.question_count })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden />
            {quiz.time_limit_minutes
              ? t("quizzes.minutes", { count: quiz.time_limit_minutes })
              : t("quizzes.noTimeLimit")}
          </span>
        </p>
        {quiz.lesson && (
          <p className="mt-1 flex items-center gap-1">
            <BookOpen className="size-4 shrink-0" aria-hidden />
            <span className="line-clamp-1">{t("quizzes.fromLesson", { title: quiz.lesson.title })}</span>
          </p>
        )}
        {quiz.villages.length > 0 && (
          <p className="mt-1 flex items-center gap-1">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="line-clamp-1">{quiz.villages.map((v) => v.name).join(", ")}</span>
          </p>
        )}
        <span className="mt-3 flex items-center gap-1 font-semibold text-primary">
          {t("quizzes.open")}
          <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </article>
  );
}
