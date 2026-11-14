import { ArrowRight, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { QuizRef } from "@/lib/api/quizzes";

/** "Quizzes about this": shown on lessons, documents and villages, hidden when there are none. */
export function RelatedQuizzes({ quizzes, title }: { quizzes: QuizRef[]; title?: string }) {
  const t = useTranslations();
  if (quizzes.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
        <Sparkles className="size-5 text-gold" aria-hidden />
        {title ?? t("quizzes.related")}
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {quizzes.map((quiz) => (
          <li key={quiz.slug}>
            <Link
              href={`/quizzes/${quiz.slug}`}
              className="group flex h-full flex-col gap-2 rounded-card border border-line bg-gold-soft/60 p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="text-sm font-semibold text-ink-muted">
                {t(`gradeLevel.${quiz.grade_level}`)}
                {quiz.time_limit_minutes && (
                  <span className="ml-3 inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    {t("quizzes.minutes", { count: quiz.time_limit_minutes })}
                  </span>
                )}
              </span>
              <span className="font-semibold text-ink group-hover:text-primary">{quiz.title}</span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {t("quizzes.open")}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
