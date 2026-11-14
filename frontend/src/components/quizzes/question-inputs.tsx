"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import type { QuizQuestion, QuizResponse } from "@/lib/api/quizzes";
import { BLANK } from "@/lib/quiz-meta";

interface InputProps {
  question: QuizQuestion;
  response: QuizResponse | undefined;
  onChange: (response: QuizResponse) => void;
}

/** The answer area for any kind of question. */
export function QuestionInput(props: InputProps) {
  switch (props.question.kind) {
    case "single_choice":
    case "image_choice":
      return <ChoiceInput {...props} />;
    case "fill_blank":
      return <FillBlankInput {...props} />;
    case "riddle":
      return <TypedInput {...props} />;
    case "matching":
      return <MatchingInput {...props} />;
  }
}

/** The prompt as written; fill-in-the-blank prompts are drawn by their own input instead. */
export function QuestionPrompt({ question }: { question: QuizQuestion }) {
  if (question.kind === "fill_blank") return null;
  return (
    <p className="font-serif text-xl leading-relaxed whitespace-pre-line text-ink sm:text-2xl">
      {question.prompt}
    </p>
  );
}

const LETTERS = "ABCDEF";

function ChoiceInput({ question, response, onChange }: InputProps) {
  const chosen = response && "choice" in response ? response.choice : undefined;
  return (
    <div role="radiogroup" aria-label={question.prompt} className="grid gap-3 sm:grid-cols-2">
      {question.choices.map((choice, index) => {
        const selected = chosen === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange({ choice: choice.id })}
            className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-lg font-medium transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              selected
                ? "border-primary bg-primary-soft text-ink shadow-card"
                : "border-line bg-surface text-ink hover:border-primary/50"
            }`}
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full text-base font-bold transition ${
                selected ? "animate-pop bg-primary text-white" : "bg-surface-muted text-ink-muted"
              }`}
              aria-hidden
            >
              {selected ? <Check className="size-5" /> : LETTERS[index]}
            </span>
            {choice.text}
          </button>
        );
      })}
    </div>
  );
}

const textInputClass =
  "rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink outline-none transition placeholder:text-ink-muted/60 focus:border-primary focus:shadow-card";

function TypedInput({ response, onChange }: InputProps) {
  const t = useTranslations("quizzes.play");
  const text = response && "text" in response ? response.text : "";
  return (
    <input
      type="text"
      value={text}
      onChange={(event) => onChange({ text: event.target.value })}
      placeholder={t("typePlaceholder")}
      autoComplete="off"
      spellCheck={false}
      className={`w-full ${textInputClass}`}
    />
  );
}

/** The verse with an input box where the blank is, so the student fills it in place. */
function FillBlankInput({ question, response, onChange }: InputProps) {
  const t = useTranslations("quizzes.play");
  const text = response && "text" in response ? response.text : "";
  const [before, after = ""] = question.prompt.split(BLANK);
  return (
    <p className="font-serif text-xl leading-loose whitespace-pre-line text-ink sm:text-2xl">
      {before}
      <input
        type="text"
        value={text}
        onChange={(event) => onChange({ text: event.target.value })}
        aria-label={t("blankLabel")}
        placeholder="…"
        autoComplete="off"
        spellCheck={false}
        size={Math.max(6, text.length + 1)}
        className={`mx-1 inline-block max-w-full px-3 py-1 font-sans ${textInputClass}`}
      />
      {after}
    </p>
  );
}

/**
 * One row per left item; tap a right-hand chip to pair it. A chip already used by another row
 * is dimmed but still tappable, which moves it here — easier for small children than dragging.
 */
function MatchingInput({ question, response, onChange }: InputProps) {
  const t = useTranslations("quizzes.play");
  const matches = response && "matches" in response ? response.matches : {};
  const usedBy = new Map(Object.entries(matches).map(([pairId, right]) => [right, pairId]));

  function pick(pairId: string, right: string) {
    const next = { ...matches };
    const previousOwner = usedBy.get(right);
    if (previousOwner) delete next[previousOwner];
    if (matches[pairId] === right) delete next[pairId];
    else next[pairId] = right;
    onChange({ matches: next });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">{t("matchHint")}</p>
      {question.left_items.map((item) => {
        const pairId = String(item.id);
        return (
          <div key={item.id} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-lg font-semibold text-ink">{item.left}</p>
            <div
              role="radiogroup"
              aria-label={t("matchPick", { left: item.left })}
              className="mt-3 flex flex-wrap gap-2"
            >
              {question.right_items.map((right) => {
                const selected = matches[pairId] === right;
                const takenElsewhere = !selected && usedBy.has(right);
                return (
                  <button
                    key={right}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => pick(pairId, right)}
                    className={`min-h-11 rounded-full border-2 px-4 py-1.5 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      selected
                        ? "animate-pop border-secondary bg-secondary text-white"
                        : takenElsewhere
                          ? "border-dashed border-line bg-surface-muted text-ink-muted"
                          : "border-line bg-surface text-ink hover:border-secondary"
                    }`}
                  >
                    {right}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Whether the student has given something for this question. */
export function isAnswered(response: QuizResponse | undefined): boolean {
  if (!response) return false;
  if ("choice" in response) return true;
  if ("text" in response) return response.text.trim() !== "";
  return Object.keys(response.matches).length > 0;
}
