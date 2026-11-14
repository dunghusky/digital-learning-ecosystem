"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { fetchMyAttempts, type QuizAttempt } from "@/lib/api/quizzes";
import { formatDateTime } from "@/lib/dates";

interface QuizSummaryRow {
  slug: string;
  title: string;
  best: QuizAttempt;
  latest: QuizAttempt;
  count: number;
}

/** One row per quiz: best and latest score. Attempts arrive newest first. */
function summarize(attempts: QuizAttempt[]): QuizSummaryRow[] {
  const rows = new Map<string, QuizSummaryRow>();
  for (const attempt of attempts) {
    const row = rows.get(attempt.quiz.slug);
    if (!row) {
      rows.set(attempt.quiz.slug, {
        slug: attempt.quiz.slug,
        title: attempt.quiz.title,
        best: attempt,
        latest: attempt,
        count: 1,
      });
      continue;
    }
    row.count += 1;
    if (attempt.score / attempt.max_score > row.best.score / row.best.max_score) {
      row.best = attempt;
    }
  }
  return [...rows.values()];
}

/** The student's quiz scores, shown on "Bài của em"; hidden until they have taken a quiz. */
export function MyQuizResults() {
  const t = useTranslations("quizzes.mine");
  const [rows, setRows] = useState<QuizSummaryRow[] | null>(null);

  useEffect(() => {
    fetchMyAttempts()
      .then((attempts) => setRows(summarize(attempts)))
      .catch(() => setRows([]));
  }, []);

  if (rows === null || rows.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <Sparkles className="size-5 text-gold" aria-hidden />
        {t("title")}
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.slug}>
            <Link
              href={`/quizzes/${row.slug}`}
              className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="font-semibold text-ink group-hover:text-primary">{row.title}</span>
              <span className="mt-2 text-3xl font-extrabold text-ink tabular-nums">
                {row.best.score}
                <span className="text-lg text-ink-muted">/{row.best.max_score}</span>
              </span>
              <span className="text-sm text-ink-muted">
                {t("best")} · {t("attempts", { count: row.count })}
              </span>
              <span className="mt-1 text-xs text-ink-muted">
                {t("latest", {
                  score: row.latest.score,
                  max: row.latest.max_score,
                  date: formatDateTime(row.latest.submitted_at),
                })}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {t("again")}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
