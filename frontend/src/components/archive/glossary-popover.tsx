"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { GlossaryTerm } from "@/lib/api/documents";

/**
 * An underlined word that opens its meaning on click or tap (hover is unreliable on phones).
 * Escape or a click elsewhere closes it.
 */
export function GlossaryPopover({ text, term }: { text: string; term: GlossaryTerm }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !root.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <span ref={root} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
        className="cursor-help rounded-sm underline decoration-gold decoration-dotted decoration-2 underline-offset-4 hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-primary"
      >
        {text}
      </button>
      {open && (
        <span
          id={id}
          role="note"
          // Phones: a sheet pinned to the bottom, since a bubble next to a word near the screen
          // edge would overflow sideways. Larger screens: a bubble under the word.
          className="fixed inset-x-4 bottom-4 z-50 block animate-pop sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:left-1/2 sm:z-20 sm:mt-2 sm:w-64 sm:-translate-x-1/2 rounded-2xl border border-line bg-surface p-3 text-left font-sans text-sm leading-relaxed text-ink not-italic shadow-card-hover"
        >
          <strong className="block text-primary">{term.term}</strong>
          {term.explanation}
        </span>
      )}
    </span>
  );
}
