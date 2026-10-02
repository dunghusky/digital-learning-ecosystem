import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { VillageCard } from "@/components/village-card";
import { fetchVillages } from "@/lib/api/villages";

const FEATURED_COUNT = 6;

export default async function HomePage() {
  const t = await getTranslations();
  const villages = await fetchVillages({ page_size: FEATURED_COUNT });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-xl bg-emerald-800 px-6 py-10 text-white">
        <p className="text-sm uppercase tracking-wide text-emerald-200">{t("site.tagline")}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{t("home.heroTitle")}</h1>
        <p className="mt-3 max-w-2xl text-emerald-50">{t("home.heroLead")}</p>
        <Link
          href="/villages"
          className="mt-6 inline-block rounded bg-white px-5 py-2.5 font-medium text-emerald-800 hover:bg-emerald-50"
        >
          {t("home.exploreVillages")}
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t("home.featuredTitle")}</h2>
        {villages.results.length === 0 ? (
          <p className="mt-3 text-stone-600">{t("home.featuredEmpty")}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {villages.results.map((village) => (
              <VillageCard key={village.code} village={village} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
