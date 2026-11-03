import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DocumentCard } from "@/components/archive/document-card";
import { CraftBadge } from "@/components/craft-badge";
import { fetchDocuments } from "@/lib/api/documents";
import { fetchVillage, type VillageDetail } from "@/lib/api/villages";

type Params = Promise<{ code: string }>;

const VILLAGE_DOCUMENTS_SHOWN = 4;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  const village = await fetchVillage(code);
  if (!village) {
    return {};
  }
  return { title: village.name, description: village.short_description };
}

function Section({ title, text }: { title: string; text: string }) {
  if (!text.trim()) {
    return null;
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      {text.split("\n").map((paragraph, index) => (
        <p key={index} className="mt-3 leading-relaxed text-ink/90">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function formatLocation(village: VillageDetail): string {
  return [village.hamlet, village.commune].filter(Boolean).join(", ");
}

function formatFormerLocation(village: VillageDetail): string {
  return [village.former_commune, village.former_district].filter(Boolean).join(", ");
}

export default async function VillageDetailPage({ params }: { params: Params }) {
  const { code } = await params;
  const [t, village, documents] = await Promise.all([
    getTranslations(),
    fetchVillage(code),
    fetchDocuments({ village: code }),
  ]);

  if (!village) {
    notFound();
  }

  const recognition = [
    t(`recognitionStatus.${village.recognition_status}`),
    village.recognition_year ? `(${village.recognition_year})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
        <CraftBadge craftType={village.craft_type} />
        <span>{t(`region.${village.former_region}`)}</span>
      </p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] leading-tight font-extrabold tracking-tight text-ink">
        {village.name}
      </h1>
      {village.short_description && (
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">{village.short_description}</p>
      )}

      <dl className="mt-8 grid gap-5 rounded-card border border-line bg-surface p-6 shadow-card sm:grid-cols-2">
        <Fact label={t("village.products")} value={village.main_products} />
        <Fact label={t("village.recognition")} value={recognition} />
        <Fact label={t("village.location")} value={formatLocation(village)} />
        <Fact label={t("village.formerLocation")} value={formatFormerLocation(village)} />
        <Fact label={t("village.recognitionDecision")} value={village.recognition_decision} />
        <Fact label={t("village.contact")} value={village.contact} />
      </dl>

      <Section title={t("village.history")} text={village.history} />
      <Section title={t("village.productionProcess")} text={village.production_process} />
      <Section title={t("village.currentSituation")} text={village.current_situation} />
      <Section title={t("village.culture")} text={village.culture} />
      <Section title={t("village.visitorInfo")} text={village.visitor_info} />
      <Section title={t("village.sources")} text={village.sources} />

      {documents.count > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-ink">{t("village.documents")}</h2>
            {documents.count > VILLAGE_DOCUMENTS_SHOWN && (
              <Link
                href={`/archive?village=${code}`}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {t("village.allDocuments", { count: documents.count })}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
          <ul className="mt-4 grid gap-6 sm:grid-cols-2">
            {documents.results.slice(0, VILLAGE_DOCUMENTS_SHOWN).map((document) => (
              <li key={document.slug}>
                <DocumentCard document={document} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
