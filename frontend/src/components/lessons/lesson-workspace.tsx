"use client";

import {
  CalendarClock,
  CircleCheck,
  CloudOff,
  Lightbulb,
  Loader2,
  LogIn,
  MessageSquareQuote,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { buttonClass } from "@/components/ui/button";
import {
  type Answer,
  fetchMyAssignments,
  saveDraft,
  type StudentAssignment,
  type Submission,
  submitWork,
} from "@/lib/api/classwork";
import { ApiError } from "@/lib/api/client";
import type { LessonTask } from "@/lib/api/lessons";
import { useAuth } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/dates";
import { TASK_KIND_META } from "@/lib/lesson-meta";

/** Typing pauses this long before the draft is saved. */
const AUTOSAVE_DELAY_MS = 1200;

type Answers = Record<number, string>;

/**
 * Where the answers go. An assigned student saves to the server and hands the work in;
 * everyone else practises, with the answers kept on this device only.
 */
type Mode =
  | { kind: "loading" }
  | { kind: "local"; reason: "guest" | "notAssigned" | "notStudent" }
  | { kind: "assigned"; assignment: StudentAssignment };

type SaveState = "idle" | "pending" | "saved" | "savedLocally" | "failed";

// --- Device drafts -------------------------------------------------------------------------

const draftKey = (slug: string) => `lesson-draft:${slug}`;

function readLocalDraft(slug: string): Answers {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    return raw ? (JSON.parse(raw) as Answers) : {};
  } catch {
    return {};
  }
}

function writeLocalDraft(slug: string, answers: Answers): boolean {
  try {
    window.localStorage.setItem(draftKey(slug), JSON.stringify(answers));
    return true;
  } catch {
    return false; // Private mode or blocked storage.
  }
}

function clearLocalDraft(slug: string): void {
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    // Nothing stored.
  }
}

const toRecord = (answers: Answer[]): Answers =>
  Object.fromEntries(answers.map((answer) => [answer.task, answer.text]));

const toList = (answers: Answers, tasks: LessonTask[]): Answer[] =>
  tasks.map((task) => ({ task: task.id, text: answers[task.id] ?? "" }));

const hasContent = (answers: Answers) => Object.values(answers).some((text) => text.trim());

// --- Component -----------------------------------------------------------------------------

export function LessonWorkspace({ slug, tasks }: { slug: string; tasks: LessonTask[] }) {
  const t = useTranslations("lessons.work");
  const { state } = useAuth();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [answers, setAnswers] = useState<Answers>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Only the latest save may report its result; older replies arrive late. */
  const saveSequence = useRef(0);

  const isStudent = state.status === "authenticated" && state.user.role === "student";

  useEffect(() => {
    if (state.status === "loading") return;
    let cancelled = false;

    async function load(): Promise<{
      mode: Mode;
      submission: Submission | null;
      answers: Answers;
    }> {
      const local = readLocalDraft(slug);
      if (!isStudent) {
        const reason = state.status === "anonymous" ? "guest" : "notStudent";
        return { mode: { kind: "local", reason }, submission: null, answers: local };
      }
      try {
        const assignment = (await fetchMyAssignments()).find((item) => item.lesson.slug === slug);
        if (assignment) {
          const saved = assignment.submission;
          // A first draft may have been written before signing in: keep it.
          const start = saved?.answers.length ? toRecord(saved.answers) : local;
          return { mode: { kind: "assigned", assignment }, submission: saved, answers: start };
        }
      } catch {
        // Offline or the API failed: practising still works.
      }
      return { mode: { kind: "local", reason: "notAssigned" }, submission: null, answers: local };
    }

    void load().then((loaded) => {
      if (cancelled) return;
      setMode(loaded.mode);
      setSubmission(loaded.submission);
      setAnswers(loaded.answers);
    });
    return () => {
      cancelled = true;
    };
  }, [state.status, isStudent, slug]);

  const handedIn = submission?.status === "submitted";
  const assignment = mode.kind === "assigned" ? mode.assignment : null;

  const persist = useCallback(
    async (next: Answers) => {
      const sequence = ++saveSequence.current;
      if (!assignment) {
        setSaveState(writeLocalDraft(slug, next) ? "savedLocally" : "failed");
        return;
      }
      try {
        const saved = await saveDraft(assignment.id, toList(next, tasks));
        if (sequence !== saveSequence.current) return;
        setSubmission(saved);
        setSaveState("saved");
      } catch {
        if (sequence === saveSequence.current) setSaveState("failed");
      }
    },
    [assignment, slug, tasks],
  );

  const flush = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    void persist(answers);
  }, [answers, persist]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function onChange(taskId: number, text: string) {
    const next = { ...answers, [taskId]: text };
    setAnswers(next);
    setSaveState("pending");
    setConfirming(false);
    setSubmitError(null);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void persist(next);
    }, AUTOSAVE_DELAY_MS);
  }

  async function onSubmit() {
    if (!assignment) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setSubmitting(true);
    setSubmitError(null);
    try {
      setSubmission(await submitWork(assignment.id, toList(answers, tasks)));
      clearLocalDraft(slug);
      setConfirming(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Handed in from another tab or device: show what the teacher has.
        const fresh = (await fetchMyAssignments().catch(() => [])).find(
          (item) => item.id === assignment.id,
        );
        if (fresh?.submission) {
          setSubmission(fresh.submission);
          setAnswers(toRecord(fresh.submission.answers));
        }
      } else {
        setSubmitError(
          error instanceof ApiError && error.status === 400 ? t("emptyWork") : t("submitFailed"),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (mode.kind === "loading") {
    return (
      <p className="flex items-center gap-2 text-ink-muted" aria-busy>
        <Loader2 className="size-5 animate-spin" aria-hidden />
        {t("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ModeBanner mode={mode} slug={slug} />

      {handedIn && submission && <HandedIn submission={submission} />}

      <ol className="space-y-5">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            number={index + 1}
            value={answers[task.id] ?? ""}
            readOnly={handedIn}
            onChange={(text) => onChange(task.id, text)}
            onBlur={flush}
          />
        ))}
      </ol>

      {!handedIn && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface-muted p-4">
          <SaveIndicator state={saveState} />
          {assignment &&
            (confirming ? (
              <div
                className="flex flex-wrap items-center gap-3"
                role="alertdialog"
                aria-live="polite"
              >
                <p className="text-sm font-medium text-ink">{t("confirm")}</p>
                <button
                  type="button"
                  className={buttonClass("outline", "text-sm")}
                  onClick={() => setConfirming(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className={buttonClass("primary", "text-sm disabled:opacity-70")}
                  onClick={() => void onSubmit()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                  {t("confirmSubmit")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={buttonClass("primary", "text-sm disabled:opacity-60")}
                onClick={() => setConfirming(true)}
                disabled={!hasContent(answers)}
              >
                <Send className="size-4" aria-hidden />
                {t("submit")}
              </button>
            ))}
          {submitError && (
            <p role="alert" className="w-full text-sm font-medium text-primary-strong">
              {submitError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Pieces --------------------------------------------------------------------------------

function ModeBanner({ mode, slug }: { mode: Exclude<Mode, { kind: "loading" }>; slug: string }) {
  const t = useTranslations("lessons.work");

  if (mode.kind === "assigned") {
    const { assignment } = mode;
    return (
      <div className="rounded-card border border-secondary/30 bg-secondary-soft p-4">
        <p className="font-semibold text-ink">
          {t("assignedBy", { teacher: assignment.teacher_name || t("teacher") })}
        </p>
        {assignment.due_at && (
          <p
            className={`mt-1 inline-flex items-center gap-1.5 text-sm ${assignment.is_overdue ? "font-semibold text-primary-strong" : "text-ink-muted"}`}
          >
            <CalendarClock className="size-4" aria-hidden />
            {t(assignment.is_overdue ? "overdue" : "due", {
              date: formatDateTime(assignment.due_at),
            })}
          </p>
        )}
        {assignment.note && (
          <p className="mt-2 text-sm whitespace-pre-line text-ink/90">{assignment.note}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-line bg-surface p-4 text-sm text-ink-muted">
      <p>{t(`local.${mode.reason}`)}</p>
      {mode.reason === "guest" && (
        <Link
          href={`/login?next=${encodeURIComponent(`/lessons/${slug}`)}`}
          className={buttonClass("outline", "text-sm")}
        >
          <LogIn className="size-4" aria-hidden />
          {t("login")}
        </Link>
      )}
    </div>
  );
}

function TaskCard({
  task,
  number,
  value,
  readOnly,
  onChange,
  onBlur,
}: {
  task: LessonTask;
  number: number;
  value: string;
  readOnly: boolean;
  onChange: (text: string) => void;
  onBlur: () => void;
}) {
  const t = useTranslations("lessons");
  const { icon: Icon, color } = TASK_KIND_META[task.kind];
  const inputId = `task-${task.id}`;

  return (
    <li className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full font-bold text-white"
          style={{ backgroundColor: color }}
          aria-hidden
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase"
            style={{ color }}
          >
            <Icon className="size-4" aria-hidden />
            {t(`taskKind.${task.kind}`)}
          </p>
          <label
            htmlFor={inputId}
            className="mt-1 block leading-relaxed font-semibold whitespace-pre-line text-ink"
          >
            {task.prompt}
          </label>
          {task.hint && (
            <details className="group mt-2 text-sm">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-ink-muted marker:hidden hover:text-ink">
                <Lightbulb className="size-4 text-gold" aria-hidden />
                {t("work.hint")}
              </summary>
              <p className="mt-2 rounded-xl bg-gold-soft px-3 py-2 whitespace-pre-line text-ink/90">
                {task.hint}
              </p>
            </details>
          )}
        </div>
      </div>
      <textarea
        id={inputId}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        rows={task.kind === "reading" ? 3 : 6}
        placeholder={readOnly ? undefined : t("work.placeholder")}
        className="mt-4 w-full resize-y rounded-2xl border border-line bg-surface-muted px-4 py-3 leading-relaxed text-ink transition outline-none placeholder:text-ink-muted/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 read-only:cursor-default read-only:bg-surface-muted"
      />
    </li>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const t = useTranslations("lessons.work");
  const content: Record<SaveState, React.ReactNode> = {
    idle: t("autosave"),
    pending: (
      <>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("saving")}
      </>
    ),
    saved: (
      <>
        <CircleCheck className="size-4 text-secondary" aria-hidden />
        {t("saved")}
      </>
    ),
    savedLocally: (
      <>
        <CircleCheck className="size-4 text-secondary" aria-hidden />
        {t("savedLocally")}
      </>
    ),
    failed: (
      <>
        <CloudOff className="size-4 text-primary-strong" aria-hidden />
        {t("saveFailed")}
      </>
    ),
  };
  return (
    <p role="status" className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
      {content[state]}
    </p>
  );
}

function HandedIn({ submission }: { submission: Submission }) {
  const t = useTranslations("lessons.work");
  const { feedback } = submission;

  return (
    <div className="space-y-4">
      <p className="flex animate-pop flex-wrap items-center gap-2 rounded-card bg-secondary-soft px-4 py-3 font-semibold text-secondary">
        <CircleCheck className="size-5" aria-hidden />
        {submission.submitted_at &&
          t("handedIn", { date: formatDateTime(submission.submitted_at) })}
        {submission.is_late && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-strong">
            {t("late")}
          </span>
        )}
      </p>
      {feedback ? (
        <figure className="rounded-card border border-gold/40 bg-gold-soft p-5">
          <figcaption className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-bold text-ink">
              <MessageSquareQuote className="size-5 text-gold" aria-hidden />
              {t("feedbackFrom", { teacher: feedback.teacher_name || t("teacher") })}
            </span>
            {feedback.score !== null && (
              <span className="rounded-full bg-surface px-3 py-1 text-lg font-extrabold text-primary tabular-nums">
                {t("score", { score: feedback.score })}
              </span>
            )}
          </figcaption>
          <blockquote className="mt-3 leading-relaxed whitespace-pre-line text-ink/90">
            {feedback.comment}
          </blockquote>
        </figure>
      ) : (
        <p className="text-sm text-ink-muted">{t("waitingFeedback")}</p>
      )}
    </div>
  );
}
