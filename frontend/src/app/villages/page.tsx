import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { VillageCard } from "@/components/village-card";
import { VillageFilters } from "@/components/village-filters";
import { fetchVillages, type VillageQuery } from "@/lib/api/villages";
import { buildHref } from "@/lib/url";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("villages");
  return { title: t("title"), description: t("lead") };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageLink(query: VillageQuery, page: number): string {
  return buildHref("/villages", { ...query, page });
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

  const villages = await fetchVillages({
    ...query,
    page: page > 1 ? page : undefined,
  });
  const linkClass = buttonClass("outline", "text-sm");

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading
        as="h1"
        eyebrow={t("nav.villages")}
        title={t("villages.title")}
        lead={t("villages.lead")}
      />

      <div className="mt-8">
        <VillageFilters query={query} />
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        {t("villages.count", { count: villages.count })}
      </p>

      {villages.results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={SearchX}
            title={t("villages.empty")}
            hint={t("villages.emptyHint")}
            action={
              <Link href="/villages" className={linkClass}>
                {t("villages.reset")}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {villages.results.map((village, index) => (
            <Reveal as="li" key={village.code} delay={(index % 3) * 70}>
              <VillageCard village={village} />
            </Reveal>
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
