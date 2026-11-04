import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { GenreLabel, VillageLine } from "@/components/archive/document-parts";
import type { DocumentDetail } from "@/lib/api/documents";
import { GENRE_META } from "@/lib/genre-meta";

/** Folk verse is short; anything longer is cut here and read in full on its page. */
const MAX_LINES = 8;

/**
 * "Folk verse of the day": the backend picks a different verse each day (`/documents/featured/`),
 * shown in full like a poem card, with a link to read it with its notes and questions.
 */
export function DailyVerse({ document }: { document: DocumentDetail }) {
  const t = useTranslations("home.daily");
  const { color } = GENRE_META[document.genre];
  const lines = document.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const shown = lines.slice(0, MAX_LINES);

  return (
    <article
      className="relative flex h-full flex-col overflow-hidden rounded-card border border-line p-7 shadow-card sm:p-9"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 7%, white)` }}
    >
      <span
        className="pointer-events-none absolute -top-8 right-5 font-serif text-[9rem] leading-none opacity-15 select-none"
        style={{ color }}
        aria-hidden
      >
        “
      </span>
      <p className="text-xs font-bold tracking-[0.18em] text-ink-muted uppercase">
        {t("eyebrow")}
      </p>
      <div className="mt-3">
        <GenreLabel document={document} />
      </div>
      <blockquote
        className="mt-5 border-l-2 pl-5 font-serif text-[clamp(1.1rem,2.2vw,1.35rem)] leading-relaxed text-ink italic"
        style={{ borderColor: color }}
      >
        {shown.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
        {lines.length > shown.length && <p aria-hidden>…</p>}
      </blockquote>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-7">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold text-ink">{document.title}</h3>
          <VillageLine document={document} />
        </div>
        <Link
          href={`/archive/${document.slug}`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {t("read")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
