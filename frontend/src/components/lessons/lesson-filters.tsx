import { X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Chip } from "@/components/ui/chip";
import type { LessonQuery, Subject } from "@/lib/api/lessons";
import { SUBJECT_META, SUBJECTS } from "@/lib/lesson-meta";
import { buildHref } from "@/lib/url";

export const LESSONS_PATH = "/lessons";

/**
 * Subject tabs, then the grades of the chosen subject (or all nine). Plain links, like the
 * archive filters, so every list has a shareable URL and works without JavaScript.
 */
export function LessonFilters({ query }: { query: LessonQuery }) {
  const t = useTranslations("lessons");
  const hrefWith = (changes: Partial<LessonQuery>) =>
    buildHref(LESSONS_PATH, { ...query, ...changes, page: undefined });
  const subject = query.subject as Subject | undefined;
  const grades = subject
    ? SUBJECT_META[subject].grades
    : SUBJECTS.flatMap((s) => SUBJECT_META[s].grades);
  const hasFilters = Boolean(query.subject || query.grade || query.search);

  return (
    <div className="space-y-4">
      <nav aria-label={t("subjectLabel")} className="flex flex-wrap gap-2">
        <Chip href={hrefWith({ subject: undefined, grade: undefined })} active={!subject}>
          {t("allSubjects")}
        </Chip>
        {SUBJECTS.map((option) => (
          <Chip
            key={option}
            // Switching subject drops a grade that belongs to the other subject.
            href={hrefWith({ subject: option, grade: undefined })}
            active={subject === option}
            color={SUBJECT_META[option].color}
          >
            {t(`subject.${option}`)}
          </Chip>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-ink-muted">{t("gradeLabel")}</span>
        {grades.map((grade) => (
          <Chip
            key={grade}
            href={hrefWith({ grade: query.grade === String(grade) ? undefined : String(grade) })}
            active={query.grade === String(grade)}
            color="#2f6b4f"
          >
            {t("grade", { grade })}
          </Chip>
        ))}
        {hasFilters && (
          <Link
            href={LESSONS_PATH}
            className="ml-auto inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
          >
            <X className="size-4" aria-hidden />
            {t("reset")}
          </Link>
        )}
      </div>
    </div>
  );
}
