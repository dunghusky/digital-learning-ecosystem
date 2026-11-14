import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Subject } from "@/lib/api/lessons";
import { SUBJECT_META } from "@/lib/lesson-meta";

/** "Ngữ văn · Lớp 7" in the subject's colour, used on cards and the lesson header. */
export function SubjectBadge({ subject, grade }: { subject: Subject; grade: number }) {
  const t = useTranslations("lessons");
  const { color } = SUBJECT_META[subject];

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm font-semibold">
      <span className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: color }}>
        {t(`subject.${subject}`)}
      </span>
      <span className="inline-flex items-center gap-1 text-ink-muted">
        <GraduationCap className="size-4" aria-hidden />
        {t("grade", { grade })}
      </span>
    </span>
  );
}
