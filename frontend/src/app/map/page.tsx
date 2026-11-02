import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { locatedVillages } from "@/components/map/map-villages";
import { VillageMap } from "@/components/map/village-map";
import { fetchVillageMap } from "@/lib/api/villages";

/** Rendered per request: the build machine cannot reach the API (see the home page). */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title"), description: t("lead") };
}

export default async function MapPage() {
  const [t, collection] = await Promise.all([getTranslations("map"), fetchVillageMap()]);
  const villages = locatedVillages(collection.features);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-stone-600">{t("lead")}</p>
      <p className="mt-2 text-sm text-stone-500">
        {t("located", { located: villages.length, total: collection.features.length })}
      </p>

      <div className="mt-4 h-[calc(100dvh-16rem)] min-h-[420px] overflow-hidden rounded-xl border border-stone-200 shadow-sm">
        <VillageMap villages={villages} />
      </div>
    </main>
  );
}
