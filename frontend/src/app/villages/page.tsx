import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { VillageCard } from "@/components/village-card";
import { VillageFilters } from "@/components/village-filters";
import { fetchVillages, type VillageQuery } from "@/lib/api/villages";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("villages");
  return { title: t("title"), description: t("lead") };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageLink(query: VillageQuery, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page })) {
    if (value !== undefined && value !== "" && !(key === "page" && value === 1)) {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `/villages?${search}` : "/villages";
}

export default async function VillagesPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations();
  const params = await searchParams;
  const page = Number(first(params.page) ?? 1);
  const query: VillageQuery = {
    search: first(params.search),
    craft_type: first(params.craft_type),
    former_region: first(params.former_region),
  };

  const villages = await fetchVillages({ ...query, page: page > 1 ? page : undefined });
  const linkClass = "rounded border border-stone-300 px-3 py-2 text-sm hover:border-emerald-600";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">{t("villages.title")}</h1>
      <p className="mt-1 text-stone-600">{t("villages.lead")}</p>

      <div className="mt-6">
        <VillageFilters query={query} />
      </div>

      <p className="mt-6 text-sm text-stone-600">
        {t("villages.count", { count: villages.count })}
      </p>

      {villages.results.length === 0 ? (
        <p className="mt-4 text-stone-600">{t("villages.empty")}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {villages.results.map((village) => (
            <VillageCard key={village.code} village={village} />
          ))}
        </ul>
      )}

      {(villages.previous || villages.next) && (
        <nav className="mt-8 flex justify-between">
          {villages.previous ? (
            <Link href={pageLink(query, page - 1)} className={linkClass}>
              {t("villages.previous")}
            </Link>
          ) : (
            <span />
          )}
          {villages.next && (
            <Link href={pageLink(query, page + 1)} className={linkClass}>
              {t("villages.next")}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
