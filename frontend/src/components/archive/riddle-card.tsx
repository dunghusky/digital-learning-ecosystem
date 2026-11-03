"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { DocumentSummary } from "@/lib/api/documents";
import { GENRE_META } from "@/lib/genre-meta";

import { GenreLabel, VillageLine } from "./document-parts";

const FACE =
  "absolute inset-0 flex flex-col rounded-card border border-line p-5 shadow-card [backface-visibility:hidden]";

/**
 * A riddle that flips over to reveal its answer, so readers guess before they look.
 * Both faces stay in the DOM; `inert` keeps the hidden face out of tab order and screen readers.
 */
export function RiddleCard({ document }: { document: DocumentSummary }) {
  const t = useTranslations("archive");
  const [flipped, setFlipped] = useState(false);
  const { color } = GENRE_META[document.genre];
  const tint = `color-mix(in oklab, ${color} 14%, white)`;

  return (
    <article className="group h-full min-h-72 [perspective:1200px]">
      <div
        className="relative h-full min-h-72 transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{ transform: flipped ? "rotateY(180deg)" : undefined }}
      >
        <div className={`${FACE} bg-surface`} inert={flipped}>
          <GenreLabel document={document} />
          <h3 className="mt-2 font-semibold text-ink">{document.title}</h3>
          <div className="mt-3 font-serif text-[1.05rem] leading-relaxed text-ink italic">
            {document.excerpt.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <VillageLine document={document} />
            {document.answer && (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="ml-auto shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                style={{ backgroundColor: color }}
              >
                {t("showAnswer")}
              </button>
            )}
          </div>
        </div>

        <div
          className={`${FACE} items-center justify-center text-center [transform:rotateY(180deg)]`}
          style={{ backgroundColor: tint }}
          inert={!flipped}
          aria-live="polite"
        >
          <p className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {t("answer")}
          </p>
          <p className="mt-2 font-serif text-2xl font-semibold text-ink">
            {flipped ? document.answer : null}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-primary/40"
            >
              <RotateCcw className="size-4" aria-hidden />
              {t("hideAnswer")}
            </button>
            <Link
              href={`/archive/${document.slug}`}
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-primary hover:underline"
            >
              {t("readMore")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
