import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { fetchVillage, type VillageDetail } from "@/lib/api/villages";

type Params = Promise<{ code: string }>;

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
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-emerald-900">{title}</h2>
      {text.split("\n").map((paragraph, index) => (
        <p key={index} className="mt-2 text-stone-800">
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
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
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
  const [t, village] = await Promise.all([getTranslations(), fetchVillage(code)]);

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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-stone-600">
        {t(`craftType.${village.craft_type}`)} · {t(`region.${village.former_region}`)}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-emerald-900">{village.name}</h1>
      {village.short_description && (
        <p className="mt-3 text-lg text-stone-700">{village.short_description}</p>
      )}

      <dl className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
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
    </main>
  );
}
