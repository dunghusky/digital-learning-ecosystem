"use client";

import { ArrowLeft, CalendarClock, ChevronDown, Loader2, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

import { SaveStatus } from "@/components/account/profile-form";
import { SubjectBadge } from "@/components/lessons/lesson-parts";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ClassSubmission,
  fetchClassSubmissions,
  fetchTeachingAssignment,
  saveFeedback,
  type Submission,
  type TeacherAssignment,
} from "@/lib/api/classwork";
import { fetchLesson, type LessonTask } from "@/lib/api/lessons";
import { formatDateTime } from "@/lib/dates";

import { isTeacher, RoleGate } from "./role-gate";
import { WorkStatusBadge } from "./work-status";

export function ClassWorkView({ assignmentId }: { assignmentId: number }) {
  const t = useTranslations("classwork.teaching");
  return (
    <RoleGate
      allow={isTeacher}
      next={`/teaching/assignments/${assignmentId}`}
      deniedMessage={t("onlyTeachers")}
    >
      {() => <ClassWork assignmentId={assignmentId} />}
    </RoleGate>
  );
}

interface Loaded {
  assignment: TeacherAssignment;
  rows: ClassSubmission[];
  tasks: LessonTask[];
}

function ClassWork({ assignmentId }: { assignmentId: number }) {
  const t = useTranslations("classwork.classWork");
  const [loaded, setLoaded] = useState<Loaded | null | "missing">(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<Loaded | "missing"> {
      const assignment = await fetchTeachingAssignment(assignmentId);
      if (!assignment) return "missing";
      const [rows, lesson] = await Promise.all([
        fetchClassSubmissions(assignmentId),
        fetchLesson(assignment.lesson),
      ]);
      return { assignment, rows, tasks: lesson?.tasks ?? [] };
    }
    load()
      .then((result) => !cancelled && setLoaded(result))
      .catch(() => !cancelled && setLoaded("missing"));
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  if (loaded === null) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }
  if (loaded === "missing") {
    return (
      <EmptyState
        icon={SearchX}
        title={t("missing")}
        action={
          <Link href="/teaching" className={buttonClass("outline", "text-sm")}>
            {t("back")}
          </Link>
        }
      />
    );
  }

  const { assignment, rows, tasks } = loaded;
  const handedIn = rows.filter((row) => row.submission?.status === "submitted").length;

  function onReviewed(studentId: number, submission: Submission) {
    setLoaded((current) =>
      current && current !== "missing"
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.student.id === studentId ? { ...row, submission } : row,
            ),
          }
        : current,
    );
  }

  return (
    <div>
      <Link
        href="/teaching"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <header className="mt-5">
        <SubjectBadge
          subject={assignment.lesson_detail.subject}
          grade={assignment.lesson_detail.grade}
        />
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-ink">
          {assignment.lesson_detail.title}
        </h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden />
            {t("classOf", { className: assignment.class_name, school: assignment.school_name })}
          </span>
          {assignment.due_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-4" aria-hidden />
              {t("due", { date: formatDateTime(assignment.due_at) })}
            </span>
          )}
        </p>
        <p className="mt-4 text-sm font-semibold text-ink" aria-live="polite">
          {t("progress", { handedIn, total: rows.length })}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Users} title={t("noStudents")} hint={t("noStudentsHint")} />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {rows.map((row) => (
            <StudentRow
              key={row.student.id}
              row={row}
              tasks={tasks}
              open={openId === row.student.id}
              onToggle={() => setOpenId((id) => (id === row.student.id ? null : row.student.id))}
              onReviewed={(submission) => onReviewed(row.student.id, submission)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentRow({
  row,
  tasks,
  open,
  onToggle,
  onReviewed,
}: {
  row: ClassSubmission;
  tasks: LessonTask[];
  open: boolean;
  onToggle: () => void;
  onReviewed: (submission: Submission) => void;
}) {
  const t = useTranslations("classwork.classWork");
  const { student, submission } = row;
  // Drafts stay private to the student until they hand the work in.
  const canOpen = submission?.status === "submitted";
  const panelId = `work-${student.id}`;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={!canOpen}
        aria-expanded={canOpen ? open : undefined}
        aria-controls={canOpen ? panelId : undefined}
        className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition enabled:hover:bg-surface-muted disabled:cursor-default"
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary-strong uppercase"
        >
          {student.display_name.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{student.display_name}</span>
          <span className="block text-xs text-ink-muted">
            @{student.username}
            {submission?.submitted_at &&
              ` · ${t("handedInAt", { date: formatDateTime(submission.submitted_at) })}`}
          </span>
        </span>
        <WorkStatusBadge submission={submission} audience="teacher" />
        {canOpen && (
          <ChevronDown
            className={`size-5 text-ink-muted transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        )}
      </button>

      {canOpen && open && submission && (
        <div id={panelId} className="animate-rise border-t border-line bg-bg px-5 py-5">
          <ol className="space-y-4">
            {tasks.map((task, index) => {
              const answer = submission.answers.find((item) => item.task === task.id)?.text.trim();
              return (
                <li key={task.id}>
                  <p className="text-sm font-semibold text-ink">
                    {index + 1}. {task.prompt}
                  </p>
                  <p
                    className={`mt-1.5 rounded-2xl border border-line bg-surface px-4 py-3 leading-relaxed whitespace-pre-line ${answer ? "text-ink" : "text-ink-muted italic"}`}
                  >
                    {answer || t("noAnswer")}
                  </p>
                </li>
              );
            })}
          </ol>
          <FeedbackForm submission={submission} onSaved={onReviewed} />
        </div>
      )}
    </li>
  );
}

/** A score out of 10 with up to two decimals; Vietnamese teachers type "8,5" or "8.5". */
const SCORE_PATTERN = /^(10([.,]0+)?|[0-9]([.,][0-9]{1,2})?)$/;

function FeedbackForm({
  submission,
  onSaved,
}: {
  submission: Submission;
  onSaved: (submission: Submission) => void;
}) {
  const t = useTranslations("classwork.classWork");
  const [comment, setComment] = useState(submission.feedback?.comment ?? "");
  const [score, setScore] = useState(submission.feedback?.score?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = score.trim();
    if (!comment.trim()) {
      setError(t("commentRequired"));
      return;
    }
    if (trimmed && !SCORE_PATTERN.test(trimmed)) {
      setError(t("scoreInvalid"));
      return;
    }
    setError(null);
    setStatus("saving");
    try {
      const saved = await saveFeedback(submission.id, {
        comment: comment.trim(),
        score: trimmed ? Number(trimmed.replace(",", ".")) : null,
      });
      onSaved(saved);
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-6 space-y-4 rounded-card border border-gold/40 bg-gold-soft p-4"
    >
      <h3 className="font-bold text-ink">{t("feedbackTitle")}</h3>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <div>
          <label htmlFor={`comment-${submission.id}`} className="block text-sm font-semibold">
            {t("comment")}
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id={`comment-${submission.id}`}
            rows={3}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setStatus("idle");
            }}
            placeholder={t("commentPlaceholder")}
            className="mt-1.5 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />
        </div>
        <div>
          <label htmlFor={`score-${submission.id}`} className="block text-sm font-semibold">
            {t("score")}
          </label>
          <input
            id={`score-${submission.id}`}
            inputMode="decimal"
            value={score}
            onChange={(event) => {
              setScore(event.target.value);
              setStatus("idle");
            }}
            placeholder="8,5"
            className="mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-center text-lg font-bold text-ink tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />
          <p className="mt-1 text-center text-xs text-ink-muted">{t("outOfTen")}</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-primary-strong">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "saving"}
          className={buttonClass("primary", "text-sm disabled:opacity-70")}
        >
          {status === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {submission.feedback ? t("updateFeedback") : t("sendFeedback")}
        </button>
        <SaveStatus status={status} />
      </div>
    </form>
  );
}
