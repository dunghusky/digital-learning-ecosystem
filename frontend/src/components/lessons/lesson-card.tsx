import { ArrowRight, BookOpen, ListChecks, MapPin } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { LessonSummary } from "@/lib/api/lessons";
import { SUBJECT_META } from "@/lib/lesson-meta";

import { SubjectBadge } from "./lesson-parts";

/** Objectives shown on a card; the rest are on the lesson page. */
const CARD_OBJECTIVES = 2;

export function LessonCard({ lesson }: { lesson: LessonSummary }) {
  const t = useTranslations("lessons");
  const { color } = SUBJECT_META[lesson.subject];

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      {/* A coloured page edge, like the spine of an exercise book. */}
      <span
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <SubjectBadge subject={lesson.subject} grade={lesson.grade} />
      <h3 className="mt-3 text-lg leading-snug font-bold text-ink transition group-hover:text-primary">
        <Link
          href={`/lessons/${lesson.slug}`}
          className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
        >
          {lesson.title}
        </Link>
      </h3>

      {lesson.objectives.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink-muted">
          {lesson.objectives.slice(0, CARD_OBJECTIVES).map((objective) => (
            <li key={objective} className="line-clamp-2">
              • {objective}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-5">
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-4" aria-hidden />
            {t("documentCount", { count: lesson.document_count })}
          </span>
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-4" aria-hidden />
            {t("taskCount", { count: lesson.task_count })}
          </span>
        </p>
        {lesson.villages.length > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-muted">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="line-clamp-1">
              {lesson.villages.map((village) => village.name).join(", ")}
            </span>
          </p>
        )}
        <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary">
          {t("open")}
          <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </article>
  );
}
