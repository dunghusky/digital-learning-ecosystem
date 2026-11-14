"use client";

import { CircleCheck, CircleX, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { buttonClass } from "@/components/ui/button";
import type { QuestionResult, QuizQuestion, QuizResponse, QuizResult } from "@/lib/api/quizzes";
import { resultTier } from "@/lib/quiz-meta";

interface QuizResultViewProps {
  questions: QuizQuestion[];
  responses: Record<number, QuizResponse>;
  result: QuizResult;
  onPlayAgain: () => void;
}

export function QuizResultView({ questions, responses, result, onPlayAgain }: QuizResultViewProps) {
  const t = useTranslations("quizzes.result");
  const byQuestion = new Map(result.results.map((r) => [r.question, r]));
  const percent = result.max_score ? Math.round((result.score / result.max_score) * 100) : 0;

  return (
    <div>
      <section className="animate-rise rounded-card border border-line bg-surface p-6 text-center shadow-card sm:p-10">
        <ScoreRing percent={percent} />
        <h2 className="mt-5 text-sm font-semibold tracking-wide text-ink-muted uppercase">
          {t("title")}
        </h2>
        <p className="mt-1 text-4xl font-extrabold text-ink">
          {t("score", { score: result.score, max: result.max_score })}
        </p>
        <p className="mx-auto mt-3 max-w-md text-lg text-ink">
          {t(resultTier(result.score, result.max_score))}
        </p>
        <p className="mt-2 text-sm text-ink-muted">{result.saved ? t("saved") : t("notSaved")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onPlayAgain} className={buttonClass("primary")}>
            <RotateCcw className="size-4" aria-hidden />
            {t("playAgain")}
          </button>
          <Link href="/quizzes" className={buttonClass("outline")}>
            {t("moreQuizzes")}
          </Link>
        </div>
      </section>

      <h2 className="mt-10 text-xl font-bold text-ink">{t("review")}</h2>
      <ol className="mt-4 space-y-4">
        {questions.map((question, index) => {
          const graded = byQuestion.get(question.id);
          return graded ? (
            <ReviewItem
              key={question.id}
              number={index + 1}
              question={question}
              response={responses[question.id]}
              graded={graded}
            />
          ) : null;
        })}
      </ol>
    </div>
  );
}

/** A ring that fills up to the score, drawn with a dashed stroke. */
function ScoreRing({ percent }: { percent: number }) {
  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-surface-muted" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          className="animate-draw stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent} 100`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="flex flex-col items-center">
          <Sparkles className="size-6 animate-pop text-gold" aria-hidden />
          <span className="text-2xl font-extrabold text-ink">{percent}%</span>
        </span>
      </span>
    </div>
  );
}

interface ReviewItemProps {
  number: number;
  question: QuizQuestion;
  response: QuizResponse | undefined;
  graded: QuestionResult;
}

function ReviewItem({ number, question, response, graded }: ReviewItemProps) {
  const t = useTranslations("quizzes.result");
  const Icon = graded.is_correct ? CircleCheck : CircleX;
  const given = describeAnswer(question, response);

  return (
    <li
      className={`rounded-card border-2 bg-surface p-5 ${
        graded.is_correct ? "border-secondary/40" : "animate-shake border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold whitespace-pre-line text-ink">
          {number}. {question.prompt}
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
            graded.is_correct ? "bg-secondary-soft text-secondary" : "bg-primary-soft text-primary-strong"
          }`}
        >
          <Icon className="size-4" aria-hidden />
          {graded.is_correct ? t("correct") : t("wrong")}
          <span className="font-normal">
            · {graded.points_awarded}/{graded.points}
          </span>
        </span>
      </div>

      <div className="mt-3 space-y-1 text-ink">
        {question.kind === "matching" ? (
          <MatchingReview question={question} response={response} graded={graded} />
        ) : (
          <>
            <p className="text-ink-muted">
              {given === null ? t("noAnswer") : t("yourAnswer", { answer: given })}
            </p>
            {!graded.is_correct && (
              <p className="font-semibold text-secondary">
                {t("rightAnswer", { answer: describeSolution(question, graded) })}
              </p>
            )}
          </>
        )}
      </div>

      {graded.explanation && (
        <p className="mt-3 flex gap-2 rounded-2xl bg-gold-soft px-4 py-3 text-sm text-ink">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          <span>
            <span className="sr-only">{t("explanation")}: </span>
            {graded.explanation}
          </span>
        </p>
      )}
    </li>
  );
}

function MatchingReview({ question, response, graded }: Omit<ReviewItemProps, "number">) {
  const matches = response && "matches" in response ? response.matches : {};
  return (
    <ul className="space-y-1">
      {question.left_items.map((item) => {
        const id = String(item.id);
        const right = graded.pair_results[id];
        return (
          <li key={item.id} className="flex flex-wrap items-center gap-2">
            {right ? (
              <CircleCheck className="size-4 text-secondary" aria-hidden />
            ) : (
              <CircleX className="size-4 text-primary" aria-hidden />
            )}
            <span className="font-medium">{item.left}</span>→
            <span className={right ? "" : matches[id] ? "text-ink-muted line-through" : "text-ink-muted"}>
              {matches[id] ?? "…"}
            </span>
            {!right && (
              <span className="font-semibold text-secondary">{graded.solution.matches?.[id]}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function describeAnswer(question: QuizQuestion, response: QuizResponse | undefined): string | null {
  if (!response) return null;
  if ("choice" in response) {
    return question.choices.find((choice) => choice.id === response.choice)?.text ?? null;
  }
  if ("text" in response) return response.text.trim() || null;
  return null;
}

function describeSolution(question: QuizQuestion, graded: QuestionResult): string {
  if (graded.solution.choice != null) {
    return question.choices.find((choice) => choice.id === graded.solution.choice)?.text ?? "";
  }
  return graded.solution.answers?.join(" / ") ?? "";
}
