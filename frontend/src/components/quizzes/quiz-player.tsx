"use client";

import { ArrowLeft, ArrowRight, Clock, Send } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/auth-provider";
import { buttonClass } from "@/components/ui/button";
import {
  submitQuiz,
  type QuizDetail,
  type QuizResponse,
  type QuizResult,
} from "@/lib/api/quizzes";
import { QUESTION_KIND_META } from "@/lib/quiz-meta";

import { QuestionInput, QuestionPrompt, isAnswered } from "./question-inputs";
import { QuizResultView } from "./quiz-result";

type Phase = "intro" | "playing" | "submitting" | "done";

/**
 * Takes a quiz one question at a time, then shows the graded result. Answers stay in the
 * browser until the end: the server grades everything at once, so no answer leaks early.
 */
export function QuizPlayer({ quiz }: { quiz: QuizDetail }) {
  const t = useTranslations("quizzes.play");
  const { state: auth } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, QuizResponse>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [startedAt, setStartedAt] = useState(0);

  const questions = quiz.questions;
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const unanswered = questions.filter((q) => !isAnswered(responses[q.id])).length;

  const finish = useCallback(async () => {
    setConfirming(false);
    setError(false);
    setPhase("submitting");
    const answers = questions
      .filter((q) => isAnswered(responses[q.id]))
      .map((q) => ({ question: q.id, ...responses[q.id] }));
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    try {
      setResult(await submitQuiz(quiz.slug, answers, seconds));
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(true);
      setPhase("playing");
    }
  }, [questions, responses, quiz.slug, startedAt]);

  function start() {
    setStartedAt(Date.now());
    setResponses({});
    setResult(null);
    setIndex(0);
    setTimedOut(false);
    setPhase("playing");
  }

  if (phase === "intro") {
    const signedIn = auth.status === "authenticated";
    // Only students' results are kept; a teacher trying the quiz is graded like a guest.
    const saved = auth.user?.role === "student";
    return (
      <section className="animate-rise rounded-card border border-line bg-surface p-6 text-center shadow-card sm:p-10">
        <p className="text-lg text-ink">{t("intro", { count: questions.length })}</p>
        <p className="mt-2 text-sm text-ink-muted">
          {saved ? t("studentNote") : signedIn ? t("teacherNote") : t("guestNote")}{" "}
          {!signedIn && (
            <Link
              href={`/login?next=/quizzes/${quiz.slug}`}
              className="font-semibold text-primary hover:underline"
            >
              {t("signIn")}
            </Link>
          )}
        </p>
        <button type="button" onClick={start} className={buttonClass("primary", "mt-6 text-lg")}>
          {t("start")}
          <ArrowRight className="size-5 transition group-hover:translate-x-1" aria-hidden />
        </button>
      </section>
    );
  }

  if (phase === "done" && result) {
    return (
      <>
        {timedOut && (
          <p className="mb-4 rounded-2xl bg-gold-soft px-4 py-3 text-center font-semibold text-ink">
            {t("timeUp")}
          </p>
        )}
        <QuizResultView
          questions={questions}
          responses={responses}
          result={result}
          onPlayAgain={start}
        />
      </>
    );
  }

  const { icon: KindIcon, color } = QUESTION_KIND_META[question.kind];
  const busy = phase === "submitting";

  return (
    <section aria-busy={busy}>
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink-muted">
        <span>{t("progress", { current: index + 1, total: questions.length })}</span>
        {quiz.time_limit_minutes && (
          <Countdown
            seconds={quiz.time_limit_minutes * 60}
            startedAt={startedAt}
            onTimeUp={() => {
              setTimedOut(true);
              void finish();
            }}
          />
        )}
      </div>

      <ProgressDots
        total={questions.length}
        current={index}
        answered={questions.map((q) => isAnswered(responses[q.id]))}
        onJump={setIndex}
      />

      {/* Keyed by question so each one slides in fresh. */}
      <article
        key={question.id}
        className="mt-6 animate-rise rounded-card border border-line bg-surface p-5 shadow-card sm:p-8"
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            <KindIcon className="size-4" aria-hidden />
            {/* Labels live next to the list page's strings. */}
            <KindLabel kind={question.kind} />
          </span>
          <span className="text-sm text-ink-muted">{t("points", { count: question.points })}</span>
        </div>

        {question.image_url && (
          // External teacher-chosen links: next/image would need every host allow-listed.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.image_url}
            alt=""
            className="mt-5 max-h-80 w-full rounded-2xl bg-surface-muted object-contain"
          />
        )}

        <div className="mt-5">
          <QuestionPrompt question={question} />
        </div>
        <div className="mt-6">
          <QuestionInput
            question={question}
            response={responses[question.id]}
            onChange={(response) => setResponses((all) => ({ ...all, [question.id]: response }))}
          />
        </div>
      </article>

      {error && (
        <p role="alert" className="mt-4 text-center font-semibold text-primary-strong">
          {t("submitFailed")}
        </p>
      )}

      {confirming ? (
        <div
          role="alertdialog"
          aria-live="assertive"
          className="mt-6 animate-rise rounded-card border border-gold bg-gold-soft p-5 text-center"
        >
          <p className="font-semibold text-ink">{t("unanswered", { count: unanswered })}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => setConfirming(false)} className={buttonClass("outline")}>
              {t("keepGoing")}
            </button>
            <button type="button" onClick={() => void finish()} className={buttonClass("primary")}>
              {t("confirmFinish")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0 || busy}
            className={buttonClass("outline", "disabled:invisible")}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("back")}
          </button>
          {isLast ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => (unanswered > 0 ? setConfirming(true) : void finish())}
              className={buttonClass("primary", "disabled:opacity-60")}
            >
              <Send className="size-4" aria-hidden />
              {busy ? t("submitting") : error ? t("retry") : t("finish")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex(index + 1)}
              className={buttonClass("primary")}
            >
              {t("next")}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function KindLabel({ kind }: { kind: QuizDetail["questions"][number]["kind"] }) {
  const t = useTranslations("quizzes.kind");
  return <>{t(kind)}</>;
}

interface ProgressDotsProps {
  total: number;
  current: number;
  answered: boolean[];
  onJump: (index: number) => void;
}

/** One dot per question: filled when answered, ringed when current. Tapping one jumps there. */
function ProgressDots({ total, current, answered, onJump }: ProgressDotsProps) {
  const t = useTranslations("quizzes.play");
  return (
    <ol className="mt-3 flex flex-wrap gap-2">
      {Array.from({ length: total }, (_, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => onJump(i)}
            aria-label={t("jumpTo", { number: i + 1 })}
            aria-current={i === current ? "step" : undefined}
            className={`block h-2.5 rounded-full transition-all ${
              i === current ? "w-8 bg-primary" : answered[i] ? "w-2.5 bg-secondary" : "w-2.5 bg-line"
            }`}
          />
        </li>
      ))}
    </ol>
  );
}

interface CountdownProps {
  seconds: number;
  startedAt: number;
  onTimeUp: () => void;
}

/** Counts down from the start time; calls onTimeUp once when it reaches zero. */
function Countdown({ seconds, startedAt, onTimeUp }: CountdownProps) {
  const t = useTranslations("quizzes.play");
  const [left, setLeft] = useState(seconds);
  const timeUp = useRef(onTimeUp);
  useEffect(() => {
    timeUp.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        timeUp.current();
      }
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [seconds, startedAt]);

  const minutes = Math.floor(left / 60);
  const time = `${minutes}:${String(left % 60).padStart(2, "0")}`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
        left <= 30 ? "animate-pulse bg-primary-soft text-primary-strong" : "bg-surface-muted"
      }`}
    >
      <Clock className="size-4" aria-hidden />
      {t("timeLeft", { time })}
    </span>
  );
}
