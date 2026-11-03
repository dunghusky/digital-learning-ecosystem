import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { DocumentSummary } from "@/lib/api/documents";
import { GENRE_META } from "@/lib/genre-meta";

import { GenreLabel, VillageLine } from "./document-parts";
import { RiddleCard } from "./riddle-card";

const CARD_CLASS =
  "group relative flex h-full flex-col rounded-card border border-line p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover";
/** Stretches the title link over the whole card, so the card is clickable without nesting links. */
const STRETCHED_LINK =
  "after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary";

/** Picks the card layout for the document's genre (see GENRE_META.layout). */
export function DocumentCard({ document }: { document: DocumentSummary }) {
  switch (GENRE_META[document.genre].layout) {
    case "verse":
      return document.excerpt.length > 0 ? (
        <VerseCard document={document} />
      ) : (
        <StoryCard document={document} />
      );
    case "riddle":
      return <RiddleCard document={document} />;
    case "story":
      return <StoryCard document={document} />;
  }
}

/** Folk verse as a small printed card: the verse itself is the hook, the title comes second. */
function VerseCard({ document }: { document: DocumentSummary }) {
  const { color } = GENRE_META[document.genre];

  return (
    <article
      className={`${CARD_CLASS} overflow-hidden`}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 6%, white)` }}
    >
      <span
        className="pointer-events-none absolute -top-6 right-3 font-serif text-[7rem] leading-none opacity-15 select-none"
        style={{ color }}
        aria-hidden
      >
        “
      </span>
      <GenreLabel document={document} />
      <blockquote
        className="mt-4 border-l-2 pl-4 font-serif text-[1.05rem] leading-relaxed text-ink italic"
        style={{ borderColor: color }}
      >
        {document.excerpt.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </blockquote>
      <div className="mt-auto space-y-1 pt-5">
        <h3 className="font-semibold text-ink transition group-hover:text-primary">
          <Link href={`/archive/${document.slug}`} className={STRETCHED_LINK}>
            {document.title}
          </Link>
        </h3>
        <VillageLine document={document} />
      </div>
    </article>
  );
}

/** Legends, essays, reportage: title and summary, like an article teaser. */
function StoryCard({ document }: { document: DocumentSummary }) {
  const t = useTranslations("archive");

  return (
    <article className={`${CARD_CLASS} bg-surface`}>
      <GenreLabel document={document} />
      <h3 className="mt-2 text-lg font-bold text-ink transition group-hover:text-primary">
        <Link href={`/archive/${document.slug}`} className={STRETCHED_LINK}>
          {document.title}
        </Link>
      </h3>
      {document.summary && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
          {document.summary}
        </p>
      )}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <VillageLine document={document} />
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          {t("readMore")}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </article>
  );
}
