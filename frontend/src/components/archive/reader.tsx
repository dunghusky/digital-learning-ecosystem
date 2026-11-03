"use client";

import { AArrowDown, AArrowUp, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import type { DocumentDetail } from "@/lib/api/documents";
import { annotate } from "@/lib/annotate";
import { GENRE_META } from "@/lib/genre-meta";

import { GlossaryPopover } from "./glossary-popover";

/** Text sizes in rem; the reader steps through them with A-/A+. */
const SCALES = [1, 1.125, 1.25, 1.375, 1.5] as const;
const STORAGE_KEY = "archive:font-scale";
const CHANGE_EVENT = "archive:font-scale";

function readStoredScale(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = Number(raw);
    return raw !== null && Number.isInteger(stored) && stored >= 0 && stored < SCALES.length
      ? stored
      : null;
  } catch {
    return null; // storage blocked (private mode, disabled cookies)
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function storeScale(index: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    // Not saved, but still applied below through the event.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The document text with its glossary marked inline and a remembered text size.
 * Primary-school texts start one step larger; once a reader picks a size it applies everywhere.
 */
export function Reader({ document }: { document: DocumentDetail }) {
  const t = useTranslations("archive");
  const defaultIndex = document.grade_level === "primary" ? 2 : 1;
  const [sessionIndex, setSessionIndex] = useState<number | null>(null);
  const storedIndex = useSyncExternalStore(subscribe, readStoredScale, () => null);
  const index = sessionIndex ?? storedIndex ?? defaultIndex;

  const resize = (step: number) => {
    const next = Math.min(SCALES.length - 1, Math.max(0, index + step));
    setSessionIndex(next);
    storeScale(next);
  };

  const isVerse = GENRE_META[document.genre].layout !== "story";
  const seen = new Set<string>();
  const lines = document.body.split("\n");

  return (
    <div>
      <div className="flex justify-end gap-1" role="group" aria-label={t("fontLarger")}>
        <SizeButton label={t("fontSmaller")} disabled={index === 0} onClick={() => resize(-1)}>
          <AArrowDown className="size-5" aria-hidden />
        </SizeButton>
        <SizeButton
          label={t("fontLarger")}
          disabled={index === SCALES.length - 1}
          onClick={() => resize(1)}
        >
          <AArrowUp className="size-5" aria-hidden />
        </SizeButton>
      </div>

      <div
        className={
          isVerse
            ? "mt-4 rounded-card border border-line bg-surface px-6 py-8 text-center font-serif leading-loose text-ink italic shadow-card sm:px-10"
            : "mt-4 leading-relaxed text-ink/90"
        }
        style={{ fontSize: `${SCALES[index] * (isVerse ? 1.15 : 1)}rem` }}
      >
        {lines.map((line, lineIndex) =>
          line.trim() ? (
            <p key={lineIndex} className={isVerse ? "" : "mt-4 first:mt-0"}>
              {annotate(line, document.glossary, seen).map((segment, segmentIndex) =>
                typeof segment === "string" ? (
                  segment
                ) : (
                  <GlossaryPopover key={segmentIndex} text={segment.text} term={segment.term} />
                ),
              )}
            </p>
          ) : (
            // A blank line separates stanzas in verse, paragraphs in prose.
            isVerse && <div key={lineIndex} className="h-4" aria-hidden />
          ),
        )}
      </div>

      {document.answer && <RiddleAnswer answer={document.answer} />}
    </div>
  );
}

function SizeButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
    >
      {children}
    </button>
  );
}

function RiddleAnswer({ answer }: { answer: string }) {
  const t = useTranslations("archive");
  const [shown, setShown] = useState(false);

  return (
    <div className="mt-6 text-center" aria-live="polite">
      {shown ? (
        <p className="inline-block animate-pop rounded-card bg-gold-soft px-6 py-4">
          <span className="block text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {t("answer")}
          </span>
          <span className="mt-1 block font-serif text-2xl font-semibold text-ink">{answer}</span>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-semibold text-ink shadow-sm transition hover:-translate-y-px"
        >
          <Eye className="size-4" aria-hidden />
          {t("showAnswer")}
        </button>
      )}
    </div>
  );
}
