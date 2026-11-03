import { Dices, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ARCHIVE_PATH, ArchiveFilters } from "@/components/archive/archive-filters";
import { ArchiveSearch } from "@/components/archive/archive-search";
import { DocumentCard } from "@/components/archive/document-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { type DocumentQuery, fetchDocuments, fetchGenreCounts } from "@/lib/api/documents";
import { fetchVillageMap } from "@/lib/api/villages";
import { buildHref } from "@/lib/url";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("archive");
  return {
    title: t("title"),
    description: t("lead"),
    openGraph: { title: t("title"), description: t("lead"), url: "/archive" },
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations();
  const params = await searchParams;
  const page = Number(first(params.page) ?? 1);
  const query: DocumentQuery = {
    search: first(params.search),
    genre: first(params.genre),
    grade_level: first(params.grade_level),
    village: first(params.village),
  };

  // The village picker reuses the map endpoint: it lists every published village in one call.
  const [documents, genreCounts, villageMap] = await Promise.all([
    fetchDocuments({ ...query, page: page > 1 ? page : undefined }),
    fetchGenreCounts(),
    fetchVillageMap(),
  ]);
  const villages = villageMap.features
    .map((feature) => ({ code: feature.id, name: feature.properties.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const linkClass = buttonClass("outline", "text-sm");

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading
        as="h1"
        eyebrow={t("archive.eyebrow")}
        title={t("archive.title")}
        lead={t("archive.lead")}
      />

      <div className="mt-8 space-y-5">
        <ArchiveSearch villages={villages} />
        <ArchiveFilters query={query} genreCounts={genreCounts} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {t("archive.count", { count: documents.count })}
        </p>
        {documents.count > 1 && (
          // A route handler picks the document, so never prefetch: each click must roll again.
          <Link
            href={buildHref(`${ARCHIVE_PATH}/random`, { ...query })}
            prefetch={false}
            className={buttonClass("outline", "group/dice text-sm")}
          >
            <Dices
              className="size-4 transition duration-500 group-hover/dice:rotate-180"
              aria-hidden
            />
            {t("archive.random")}
          </Link>
        )}
      </div>

      {documents.results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={SearchX}
            title={t("archive.empty")}
            hint={t("archive.emptyHint")}
            action={
              <Link href={ARCHIVE_PATH} className={linkClass}>
                {t("archive.reset")}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {documents.results.map((document, index) => (
            <Reveal as="li" key={document.slug} delay={(index % 3) * 70}>
              <DocumentCard document={document} />
            </Reveal>
          ))}
        </ul>
      )}

      {(documents.previous || documents.next) && (
        <nav className="mt-8 flex justify-between">
          {documents.previous ? (
            <Link
              href={buildHref(ARCHIVE_PATH, { ...query, page: page - 1 })}
              className={linkClass}
            >
              {t("archive.previous")}
            </Link>
          ) : (
            <span />
          )}
          {documents.next && (
            <Link
              href={buildHref(ARCHIVE_PATH, { ...query, page: page + 1 })}
              className={linkClass}
            >
              {t("archive.next")}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
