"use client";

import { ArrowRight, CalendarClock, Inbox, MessageSquareQuote, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { SubjectBadge } from "@/components/lessons/lesson-parts";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { CurrentUser } from "@/lib/api/auth";
import { fetchMyAssignments, type StudentAssignment } from "@/lib/api/classwork";
import { formatDateTime } from "@/lib/dates";

import { isStudent, RoleGate } from "./role-gate";
import { type WorkStatus, WorkStatusBadge, workStatusOf } from "./work-status";

/** Work still to do comes first, then work waiting for the teacher, then reviewed work. */
const GROUPS: { key: "todo" | "waiting" | "reviewed"; statuses: WorkStatus[] }[] = [
  { key: "todo", statuses: ["notStarted", "draft"] },
  { key: "waiting", statuses: ["submitted"] },
  { key: "reviewed", statuses: ["reviewed"] },
];

export function MyWorkView() {
  const t = useTranslations("classwork.myWork");
  return (
    <RoleGate allow={isStudent} next="/my-work" deniedMessage={t("onlyStudents")}>
      {(user) => <MyWork user={user} />}
    </RoleGate>
  );
}

function MyWork({ user }: { user: CurrentUser }) {
  const t = useTranslations("classwork.myWork");
  const [assignments, setAssignments] = useState<StudentAssignment[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetchMyAssignments()
      .then((items) => {
        setAssignments(items);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  return (
    <div>
      <header>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-ink-muted">
          {t("lead", { className: user.class_name, school: user.school_name })}
        </p>
      </header>

      <div className="mt-8">
        {failed ? (
          <EmptyState
            icon={RefreshCw}
            title={t("failed")}
            action={
              <button type="button" onClick={load} className={buttonClass("outline", "text-sm")}>
                {t("retry")}
              </button>
            }
          />
        ) : assignments === null ? (
          <div className="space-y-4" aria-busy>
            <Skeleton className="h-36 rounded-card" />
            <Skeleton className="h-36 rounded-card" />
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("empty")}
            hint={t("emptyHint")}
            action={
              <Link href="/lessons" className={buttonClass("outline", "text-sm")}>
                {t("browse")}
              </Link>
            }
          />
        ) : (
          <div className="space-y-10">
            {GROUPS.map(({ key, statuses }) => {
              const items = assignments.filter((item) =>
                statuses.includes(workStatusOf(item.submission)),
              );
              if (items.length === 0) return null;
              return (
                <section key={key}>
                  <h2 className="text-lg font-bold text-ink">
                    {t(`groups.${key}`)}{" "}
                    <span className="text-ink-muted tabular-nums">({items.length})</span>
                  </h2>
                  <ul className="mt-4 space-y-4">
                    {items.map((assignment, index) => (
                      <li
                        key={assignment.id}
                        className="animate-rise"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <AssignmentCard assignment={assignment} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  const t = useTranslations("classwork.myWork");
  const { lesson, submission } = assignment;
  const status = workStatusOf(submission);
  const feedback = submission?.feedback;

  return (
    <article className="group relative rounded-card border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SubjectBadge subject={lesson.subject} grade={lesson.grade} />
        <WorkStatusBadge submission={submission} audience="student" />
      </div>
      <h3 className="mt-3 text-lg font-bold text-ink group-hover:text-primary">
        <Link
          href={`/lessons/${lesson.slug}`}
          className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary"
        >
          {lesson.title}
        </Link>
      </h3>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
        <span>{t("from", { teacher: assignment.teacher_name || t("teacher") })}</span>
        {assignment.due_at && (
          <span
            className={`inline-flex items-center gap-1 ${
              assignment.is_overdue && status !== "submitted" && status !== "reviewed"
                ? "font-semibold text-primary-strong"
                : ""
            }`}
          >
            <CalendarClock className="size-4" aria-hidden />
            {t("due", { date: formatDateTime(assignment.due_at) })}
          </span>
        )}
      </p>

      {feedback && (
        <blockquote className="mt-4 flex gap-2 rounded-2xl bg-gold-soft px-4 py-3 text-sm leading-relaxed text-ink/90">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          <span className="line-clamp-3 whitespace-pre-line">{feedback.comment}</span>
        </blockquote>
      )}

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        {t(`action.${status}`)}
        <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
      </span>
    </article>
  );
}
