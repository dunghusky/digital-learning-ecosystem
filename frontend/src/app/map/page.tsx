import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/ui/section-heading";
import { locatedVillages } from "@/components/map/map-villages";
import { VillageMap } from "@/components/map/village-map";
import { fetchVillageMap } from "@/lib/api/villages";

/** Rendered per request: the build machine cannot reach the API (see the home page). */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title"), description: t("lead") };
}

type SearchParams = Promise<{ village?: string | string[] }>;

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const { village } = await searchParams;
  const [t, collection] = await Promise.all([getTranslations("map"), fetchVillageMap()]);
  const villages = locatedVillages(collection.features);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <SectionHeading as="h1" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <p className="mt-3 text-sm text-ink-muted">
        {t("located", {
          located: villages.length,
          total: collection.features.length,
        })}
      </p>

      <div className="mt-4 h-[calc(100dvh-16rem)] min-h-[420px] overflow-hidden rounded-card border border-line shadow-card">
        <VillageMap
          villages={villages}
          initialCode={typeof village === "string" ? village : undefined}
        />
      </div>
    </main>
  );
}
