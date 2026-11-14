import { CircleCheck, CircleDashed, Hourglass, MessageSquareQuote, PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Submission } from "@/lib/api/classwork";

export type WorkStatus = "notStarted" | "draft" | "submitted" | "reviewed";

export function workStatusOf(submission: Submission | null): WorkStatus {
  if (!submission) return "notStarted";
  if (submission.status === "draft") return "draft";
  return submission.feedback ? "reviewed" : "submitted";
}

const STYLE: Record<WorkStatus, { icon: typeof CircleCheck; className: string }> = {
  notStarted: { icon: CircleDashed, className: "bg-surface-muted text-ink-muted" },
  draft: { icon: PencilLine, className: "bg-gold-soft text-ink" },
  submitted: { icon: Hourglass, className: "bg-indigo-soft text-indigo" },
  reviewed: { icon: MessageSquareQuote, className: "bg-secondary-soft text-secondary" },
};

/** Small pill for where a piece of work stands, shared by the student and teacher views. */
export function WorkStatusBadge({
  submission,
  audience,
}: {
  submission: Submission | null;
  /** Students read "Chưa làm"; teachers read "Chưa bắt đầu" etc. */
  audience: "student" | "teacher";
}) {
  const t = useTranslations("classwork.status");
  const status = workStatusOf(submission);
  const { icon: Icon, className } = STYLE[status];

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      >
        <Icon className="size-3.5" aria-hidden />
        {t(`${audience}.${status}`)}
      </span>
      {submission?.is_late && (
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-strong">
          {t("late")}
        </span>
      )}
      {submission?.feedback?.score != null && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-line tabular-nums">
          <CircleCheck className="size-3.5" aria-hidden />
          {submission.feedback.score}/10
        </span>
      )}
    </span>
  );
}
