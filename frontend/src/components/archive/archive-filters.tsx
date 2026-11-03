import { X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Chip } from "@/components/ui/chip";
import type { DocumentQuery, GenreCount } from "@/lib/api/documents";
import { GENRE_META, GENRES, GRADE_FILTERS } from "@/lib/genre-meta";
import { buildHref } from "@/lib/url";

export const ARCHIVE_PATH = "/archive";

interface ArchiveFiltersProps {
  query: DocumentQuery;
  genreCounts: GenreCount[];
}

/**
 * Genre tabs and grade chips are plain links, like the village filters, so every result set
 * has a shareable URL and works without JavaScript. Genres with nothing published are hidden.
 */
export function ArchiveFilters({ query, genreCounts }: ArchiveFiltersProps) {
  const t = useTranslations();
  const hrefWith = (changes: Partial<DocumentQuery>) =>
    buildHref(ARCHIVE_PATH, { ...query, ...changes, page: undefined });
  const countOf = new Map(genreCounts.map(({ genre, count }) => [genre, count]));
  const total = genreCounts.reduce((sum, { count }) => sum + count, 0);
  const hasFilters = Boolean(query.search || query.genre || query.grade_level || query.village);

  return (
    <div className="space-y-4">
      <nav
        aria-label={t("archive.eyebrow")}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        <Chip href={hrefWith({ genre: undefined })} active={!query.genre}>
          {t("archive.allGenres")}
          <Count value={total} />
        </Chip>
        {GENRES.filter((genre) => countOf.has(genre)).map((genre) => (
          <Chip
            key={genre}
            href={hrefWith({ genre })}
            active={query.genre === genre}
            icon={GENRE_META[genre].icon}
            color={GENRE_META[genre].color}
          >
            {t(`genre.${genre}`)}
            <Count value={countOf.get(genre) ?? 0} />
          </Chip>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-ink-muted">{t("archive.gradeLevel")}</span>
        {GRADE_FILTERS.map((grade) => (
          <Chip
            key={grade}
            href={hrefWith({ grade_level: query.grade_level === grade ? undefined : grade })}
            active={query.grade_level === grade}
            color="#2f6b4f"
          >
            {t(`gradeLevel.${grade}`)}
          </Chip>
        ))}
        {hasFilters && (
          <Link
            href={ARCHIVE_PATH}
            className="ml-auto inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
          >
            <X className="size-4" aria-hidden />
            {t("archive.reset")}
          </Link>
        )}
      </div>
    </div>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-current/15 px-1.5 text-xs font-semibold tabular-nums">
      {value}
    </span>
  );
}
