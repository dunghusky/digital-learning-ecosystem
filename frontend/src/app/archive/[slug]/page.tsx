import { ArrowLeft, ExternalLink, GraduationCap, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DocumentActions } from "@/components/archive/document-actions";
import { DocumentCard } from "@/components/archive/document-card";
import { GenreLabel } from "@/components/archive/document-parts";
import { Reader } from "@/components/archive/reader";
import { MiniMap } from "@/components/map/mini-map";
import { toMiniMapPlaces } from "@/components/map/mini-map-places";
import { CRAFT_META } from "@/lib/craft-meta";
import { type DocumentDetail, fetchDocument } from "@/lib/api/documents";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const document = await fetchDocument(slug);
  if (!document) {
    return {};
  }
  // Verse has no summary: its first two lines make a good share preview.
  const description = document.summary || document.body.split("\n").slice(0, 2).join(" / ");
  return {
    title: document.title,
    description,
    alternates: { canonical: `/archive/${slug}` },
    openGraph: {
      type: "article",
      title: document.title,
      description,
      url: `/archive/${slug}`,
      publishedTime: document.published_at ?? undefined,
      modifiedTime: document.updated_at,
    },
  };
}

export default async function DocumentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [t, document] = await Promise.all([getTranslations(), fetchDocument(slug)]);

  if (!document) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/archive"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("archive.title")}
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <GenreLabel document={document} />
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
            <GraduationCap className="size-4" aria-hidden />
            {t(`gradeLevel.${document.grade_level}`)}
          </span>
        </div>
        <h1 className="mt-3 text-[clamp(2rem,5vw,2.75rem)] leading-tight font-extrabold tracking-tight text-ink">
          {document.title}
        </h1>
        {document.summary && (
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">{document.summary}</p>
        )}
        <div className="mt-6">
          <DocumentActions title={document.title} text={document.body} />
        </div>
      </header>

      <div className="mt-8">
        <Reader document={document} />
      </div>

      {document.reading_questions.length > 0 && (
        <details className="group mt-10 rounded-card border border-line bg-secondary-soft/50 p-5 open:bg-secondary-soft">
          <summary className="cursor-pointer list-none font-bold text-ink marker:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="transition group-open:rotate-90" aria-hidden>
                ▸
              </span>
              {t("archive.readingQuestions")} ({document.reading_questions.length})
            </span>
          </summary>
          <ol className="mt-4 list-decimal space-y-2 pl-6 leading-relaxed text-ink/90">
            {document.reading_questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </details>
      )}

      {document.glossary.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-ink">{t("archive.glossary")}</h2>
          <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
            {document.glossary.map((entry) => (
              <div key={entry.term} className="grid gap-1 px-5 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="font-semibold text-primary">{entry.term}</dt>
                <dd className="text-ink/90">{entry.explanation}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {document.villages.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-ink">{t("archive.relatedVillages")}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {document.villages.map((village) => (
              <li key={village.code}>
                <Link
                  href={`/villages/${village.code}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-ink transition hover:-translate-y-px hover:border-primary/40 hover:shadow-card"
                >
                  <MapPin
                    className="size-4"
                    style={{ color: CRAFT_META[village.craft_type].color }}
                    aria-hidden
                  />
                  {village.name}
                </Link>
              </li>
            ))}
          </ul>
          <MiniMap places={toMiniMapPlaces(document.villages)} className="mt-5" />
        </section>
      )}

      <SourceBox document={document} t={t} />

      {document.related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-ink">{t("archive.related")}</h2>
          <ul className="mt-4 grid gap-6 sm:grid-cols-2">
            {document.related.map((related) => (
              <li key={related.slug}>
                <DocumentCard document={related} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** Folk works must cite where they come from (IP law, art. 23), so this box is never hidden. */
function SourceBox({
  document,
  t,
}: {
  document: DocumentDetail;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const facts = [
    { label: t("archive.author"), value: document.author },
    { label: t("archive.collector"), value: document.collector },
    { label: t("archive.source"), value: document.source },
  ].filter((fact) => fact.value.trim());

  return (
    <aside className="mt-10 rounded-card border border-dashed border-line bg-surface-muted p-5 text-sm">
      <h2 className="font-bold text-ink">{t("archive.sourceAndLicense")}</h2>
      <dl className="mt-3 space-y-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-wrap gap-x-2">
            <dt className="text-ink-muted">{fact.label}:</dt>
            <dd className="text-ink">{fact.value}</dd>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-2">
          <dt className="sr-only">License</dt>
          <dd className="text-ink-muted italic">{t(`license.${document.license}`)}</dd>
        </div>
      </dl>
      {document.source_url && (
        <a
          href={document.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          {t("archive.viewSource")}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </aside>
  );
}
