"use client";

import { BarChart3, Loader2, School, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

import { Field } from "@/components/auth/form-field";
import { buttonClass } from "@/components/ui/button";
import {
  type ClassQuizResults,
  fetchAllQuizzes,
  fetchClassQuizResults,
  type QuizSummary,
} from "@/lib/api/quizzes";
import { normalizeClassName } from "@/lib/auth/validation";
import { formatDateTime } from "@/lib/dates";

/** Teacher tool: pick a quiz and a class, see each student's score and the hardest questions. */
export function ClassQuizResultsPanel({ defaultSchool }: { defaultSchool: string }) {
  const t = useTranslations("quizzes.teaching");
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [quiz, setQuiz] = useState("");
  const [school, setSchool] = useState(defaultSchool);
  const [className, setClassName] = useState("");
  const [results, setResults] = useState<ClassQuizResults | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchAllQuizzes()
      .then(setQuizzes)
      .catch(() => setQuizzes([]));
  }, []);

  const ready = Boolean(quiz && school.trim() && className.trim());

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setPending(true);
    setFailed(false);
    try {
      setResults(await fetchClassQuizResults(quiz, school.trim(), normalizeClassName(className)));
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
        <BarChart3 className="size-5 text-gold" aria-hidden />
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div>
          <label htmlFor="results-quiz" className="block text-sm font-semibold">
            {t("quiz")}
          </label>
          <select
            id="results-quiz"
            value={quiz}
            onChange={(event) => setQuiz(event.target.value)}
            disabled={quizzes === null}
            className="mt-1.5 min-h-13 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink transition outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
          >
            <option value="">{quizzes === null ? t("loading") : t("pickQuiz")}</option>
            {quizzes?.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field
            label={t("school")}
            icon={School}
            value={school}
            onChange={(event) => setSchool(event.target.value)}
          />
          <Field
            label={t("class")}
            icon={Users}
            placeholder="7B"
            autoCapitalize="characters"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={!ready || pending}
          className={buttonClass("primary", "disabled:opacity-60")}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("show")}
        </button>
        {failed && (
          <p role="alert" className="text-sm font-semibold text-primary-strong">
            {t("failed")}
          </p>
        )}
      </form>

      {results && <ResultsTables results={results} />}
    </section>
  );
}

function ResultsTables({ results }: { results: ClassQuizResults }) {
  const t = useTranslations("quizzes.teaching");
  const took = results.students.filter((s) => s.attempt_count > 0).length;

  if (results.students.length === 0) {
    return <p className="mt-6 text-ink-muted">{t("noStudents")}</p>;
  }

  return (
    <div className="mt-8 space-y-8" aria-live="polite">
      <div>
        <h3 className="font-bold text-ink">
          {t("studentsTitle", { took, total: results.students.length })}
        </h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-surface-muted text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">{t("student")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("best")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("last")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("attempts")}</th>
              </tr>
            </thead>
            <tbody>
              {results.students.map((student) => (
                <tr key={student.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-medium text-ink">{student.display_name}</td>
                  {student.attempt_count === 0 ? (
                    <td colSpan={3} className="px-4 py-2.5 text-ink-muted italic">
                      {t("notYet")}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-semibold text-ink tabular-nums">
                        {student.best_score}/{results.max_score}
                      </td>
                      <td className="px-4 py-2.5 text-ink tabular-nums">
                        {student.last_score}/{results.max_score}
                        {student.last_submitted_at && (
                          <span className="ml-2 text-xs text-ink-muted">
                            {formatDateTime(student.last_submitted_at)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink tabular-nums">{student.attempt_count}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {took > 0 && (
        <div>
          <h3 className="font-bold text-ink">{t("questionsTitle")}</h3>
          <p className="mt-1 text-sm text-ink-muted">{t("questionsHint")}</p>
          <ul className="mt-3 space-y-3">
            {results.questions.map((question) => {
              const percent = took ? Math.round((question.correct / took) * 100) : 0;
              const hard = percent < 50;
              return (
                <li key={question.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm whitespace-pre-line text-ink">
                      {question.order}. {question.prompt}
                    </p>
                    <span
                      className={`shrink-0 text-sm font-bold tabular-nums ${hard ? "text-primary-strong" : "text-secondary"}`}
                    >
                      {t("correctOf", { correct: question.correct, total: took })}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
                    role="img"
                    aria-label={`${percent}%`}
                  >
                    <div
                      className={`h-full rounded-full ${hard ? "bg-primary" : "bg-secondary"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
