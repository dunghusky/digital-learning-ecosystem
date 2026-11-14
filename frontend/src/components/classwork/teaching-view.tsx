"use client";

import {
  CalendarClock,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  School,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Field, focusFirstInvalid } from "@/components/auth/form-field";
import { SubjectBadge } from "@/components/lessons/lesson-parts";
import { ClassQuizResultsPanel } from "@/components/quizzes/class-quiz-results";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { CurrentUser } from "@/lib/api/auth";
import {
  createAssignment,
  deleteAssignment,
  fetchTeachingAssignments,
  type TeacherAssignment,
} from "@/lib/api/classwork";
import { ApiError } from "@/lib/api/client";
import { fetchAllLessons, type LessonSummary } from "@/lib/api/lessons";
import { normalizeClassName } from "@/lib/auth/validation";
import { formatDateTime, fromDateTimeLocal } from "@/lib/dates";

import { isTeacher, RoleGate } from "./role-gate";

export function TeachingView() {
  const t = useTranslations("classwork.teaching");
  return (
    <RoleGate allow={isTeacher} next="/teaching" deniedMessage={t("onlyTeachers")}>
      {(user) => <Teaching user={user} />}
    </RoleGate>
  );
}

function Teaching({ user }: { user: CurrentUser }) {
  const t = useTranslations("classwork.teaching");
  const [assignments, setAssignments] = useState<TeacherAssignment[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetchTeachingAssignments()
      .then((items) => {
        setAssignments(items);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  async function onDelete(assignment: TeacherAssignment) {
    if (!window.confirm(t("confirmDelete", { lesson: assignment.lesson_detail.title }))) return;
    await deleteAssignment(assignment.id);
    setAssignments((items) => items?.filter((item) => item.id !== assignment.id) ?? null);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-ink-muted">{t("lead")}</p>
      </header>

      <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <Plus className="size-5 text-primary" aria-hidden />
          {t("assignTitle")}
        </h2>
        <AssignForm
          defaultSchool={user.school_name}
          onCreated={(created) => setAssignments((items) => [created, ...(items ?? [])])}
        />
      </section>

      <section>
        <h2 className="text-xl font-bold text-ink">{t("listTitle")}</h2>
        <div className="mt-4">
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
            <Skeleton className="h-32 rounded-card" />
          ) : assignments.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t("empty")} hint={t("emptyHint")} />
          ) : (
            <ul className="space-y-4">
              {assignments.map((assignment) => (
                <li key={assignment.id}>
                  <AssignmentRow
                    assignment={assignment}
                    onDelete={() => void onDelete(assignment)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ClassQuizResultsPanel defaultSchool={user.school_name} />
    </div>
  );
}

function AssignmentRow({
  assignment,
  onDelete,
}: {
  assignment: TeacherAssignment;
  onDelete: () => void;
}) {
  const t = useTranslations("classwork.teaching");
  const { lesson_detail: lesson } = assignment;

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="min-w-0 flex-1">
        <SubjectBadge subject={lesson.subject} grade={lesson.grade} />
        <h3 className="mt-2 text-lg font-bold text-ink">{lesson.title}</h3>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden />
            {t("classOf", { className: assignment.class_name, school: assignment.school_name })}
          </span>
          {assignment.due_at && (
            <span
              className={`inline-flex items-center gap-1 ${assignment.is_overdue ? "text-primary-strong" : ""}`}
            >
              <CalendarClock className="size-4" aria-hidden />
              {t("due", { date: formatDateTime(assignment.due_at) })}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/teaching/assignments/${assignment.id}`}
          className={buttonClass("primary", "text-sm")}
        >
          {t("viewWork", { count: assignment.submitted_count })}
        </Link>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("delete")}
          title={t("delete")}
          className="grid size-11 place-items-center rounded-full border border-line text-ink-muted transition hover:border-primary hover:text-primary-strong"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}

type FormField = "lesson" | "school_name" | "class_name" | "due_at";

function AssignForm({
  defaultSchool,
  onCreated,
}: {
  defaultSchool: string;
  onCreated: (assignment: TeacherAssignment) => void;
}) {
  const t = useTranslations("classwork.teaching");
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [lesson, setLesson] = useState("");
  const [school, setSchool] = useState(defaultSchool);
  const [className, setClassName] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchAllLessons()
      .then(setLessons)
      .catch(() => setLessons([]));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found: Partial<Record<FormField, string>> = {};
    if (!lesson) found.lesson = t("errors.lesson");
    if (!school.trim()) found.school_name = t("errors.school");
    if (!className.trim()) found.class_name = t("errors.class");
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(form);
      return;
    }

    setPending(true);
    try {
      const created = await createAssignment({
        lesson,
        school_name: school.trim(),
        class_name: normalizeClassName(className),
        due_at: fromDateTimeLocal(due),
        note: note.trim(),
      });
      onCreated(created);
      setClassName("");
      setDue("");
      setNote("");
      setMessage({
        kind: "ok",
        text: t("created", { lesson: created.lesson_detail.title, className: created.class_name }),
      });
    } catch (error) {
      const body = error instanceof ApiError && error.status === 400 ? error.body : null;
      if (body && typeof body === "object" && "class_name" in body) {
        // The only class error left after the checks above: the class already has this lesson.
        setErrors({ class_name: t("errors.duplicate") });
        focusFirstInvalid(form);
      } else {
        setMessage({ kind: "error", text: t("errors.failed") });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
      <div>
        <label htmlFor="assign-lesson" className="block text-sm font-semibold">
          {t("lesson")}
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        </label>
        <select
          id="assign-lesson"
          value={lesson}
          onChange={(event) => {
            setLesson(event.target.value);
            setErrors((current) => ({ ...current, lesson: undefined }));
          }}
          aria-required
          aria-invalid={errors.lesson ? true : undefined}
          aria-describedby={errors.lesson ? "assign-lesson-error" : undefined}
          disabled={lessons === null}
          className={`mt-1.5 min-h-13 w-full rounded-2xl border bg-surface px-4 text-base text-ink transition outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft ${
            errors.lesson ? "border-primary-strong" : "border-line"
          }`}
        >
          <option value="">{lessons === null ? t("loadingLessons") : t("pickLesson")}</option>
          {lessons?.map((option) => (
            <option key={option.slug} value={option.slug}>
              {t("lessonOption", { title: option.title, grade: option.grade })}
            </option>
          ))}
        </select>
        {errors.lesson && (
          <p id="assign-lesson-error" className="mt-1.5 text-sm font-medium text-primary-strong">
            {errors.lesson}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field
          label={t("school")}
          icon={School}
          required
          value={school}
          error={errors.school_name}
          onChange={(event) => {
            setSchool(event.target.value);
            setErrors((current) => ({ ...current, school_name: undefined }));
          }}
        />
        <Field
          label={t("class")}
          icon={Users}
          required
          placeholder="7B"
          autoCapitalize="characters"
          value={className}
          error={errors.class_name}
          onChange={(event) => {
            setClassName(event.target.value);
            setErrors((current) => ({ ...current, class_name: undefined }));
          }}
        />
      </div>

      <Field
        label={t("dueAt")}
        icon={CalendarClock}
        type="datetime-local"
        hint={t("dueHint")}
        value={due}
        onChange={(event) => setDue(event.target.value)}
      />

      <div>
        <label htmlFor="assign-note" className="block text-sm font-semibold">
          {t("note")}
        </label>
        <textarea
          id="assign-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("notePlaceholder")}
          className="mt-1.5 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink transition outline-none placeholder:text-ink-muted/60 focus:border-primary focus:ring-4 focus:ring-primary-soft"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass("primary", "disabled:opacity-70")}
        >
          {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {t("assign")}
        </button>
        {message && (
          <p
            role={message.kind === "ok" ? "status" : "alert"}
            className={`text-sm font-semibold ${message.kind === "ok" ? "animate-pop text-secondary" : "text-primary-strong"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
