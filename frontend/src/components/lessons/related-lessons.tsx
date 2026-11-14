import { ArrowRight, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { LessonRef } from "@/lib/api/lessons";
import { SUBJECT_META } from "@/lib/lesson-meta";

import { SubjectBadge } from "./lesson-parts";

/** "Lessons that use this": shown on documents and villages, hidden when there are none. */
export function RelatedLessons({ lessons, title }: { lessons: LessonRef[]; title: string }) {
  const t = useTranslations("lessons");
  if (lessons.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
        <NotebookPen className="size-5 text-secondary" aria-hidden />
        {title}
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {lessons.map((lesson) => (
          <li key={lesson.slug}>
            <Link
              href={`/lessons/${lesson.slug}`}
              className="group flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
              style={{ borderLeft: `6px solid ${SUBJECT_META[lesson.subject].color}` }}
            >
              <SubjectBadge subject={lesson.subject} grade={lesson.grade} />
              <span className="font-semibold text-ink group-hover:text-primary">
                {lesson.title}
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {t("open")}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
