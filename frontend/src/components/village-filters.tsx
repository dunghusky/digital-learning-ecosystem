import { Search, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Chip } from "@/components/ui/chip";
import type { VillageQuery } from "@/lib/api/villages";
import { CRAFT_META, CRAFT_TYPES, REGIONS } from "@/lib/craft-meta";
import { buildHref } from "@/lib/url";

const BASE_PATH = "/villages";

/**
 * Every chip is a plain link and the search box a GET form, so filtering works without
 * JavaScript and each result set keeps a shareable URL. Changing a filter always returns to
 * the first page because the old page number may no longer exist.
 */
export function VillageFilters({ query }: { query: VillageQuery }) {
  const t = useTranslations();
  const hrefWith = (changes: Partial<VillageQuery>) =>
    buildHref(BASE_PATH, { ...query, ...changes, page: undefined });
  const hasFilters = Boolean(query.search || query.craft_type || query.former_region);

  return (
    <div className="space-y-4">
      <form method="get" role="search" className="flex max-w-xl gap-2">
        {/* Keep the active chips when submitting a new search. */}
        {query.craft_type && <input type="hidden" name="craft_type" value={query.craft_type} />}
        {query.former_region && (
          <input type="hidden" name="former_region" value={query.former_region} />
        )}
        <label className="relative flex-1">
          <span className="sr-only">{t("villages.search")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            name="search"
            defaultValue={query.search ?? ""}
            placeholder={t("villages.searchPlaceholder")}
            className="w-full rounded-full border border-stone-300 bg-white py-2 pr-4 pl-9 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          {t("villages.search")}
        </button>
      </form>

      <FilterRow label={t("villages.craftType")}>
        <Chip href={hrefWith({ craft_type: undefined })} active={!query.craft_type}>
          {t("villages.all")}
        </Chip>
        {CRAFT_TYPES.map((craft) => (
          <Chip
            key={craft}
            href={hrefWith({ craft_type: query.craft_type === craft ? undefined : craft })}
            active={query.craft_type === craft}
            icon={CRAFT_META[craft].icon}
            color={CRAFT_META[craft].color}
          >
            {t(`craftType.${craft}`)}
          </Chip>
        ))}
      </FilterRow>

      <FilterRow label={t("villages.region")}>
        <Chip href={hrefWith({ former_region: undefined })} active={!query.former_region}>
          {t("villages.all")}
        </Chip>
        {REGIONS.map((region) => (
          <Chip
            key={region}
            href={hrefWith({ former_region: query.former_region === region ? undefined : region })}
            active={query.former_region === region}
          >
            {t(`region.${region}`)}
          </Chip>
        ))}
      </FilterRow>

      {hasFilters && (
        <Link
          href={BASE_PATH}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-emerald-700"
        >
          <X className="size-4" aria-hidden />
          {t("villages.reset")}
        </Link>
      )}
    </div>
  );
}

/** A labelled chip row: scrolls sideways on phones instead of wrapping into a tall block. */
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <span className="hidden w-20 shrink-0 text-sm text-stone-500 sm:block">{label}</span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {children}
      </div>
    </div>
  );
}
