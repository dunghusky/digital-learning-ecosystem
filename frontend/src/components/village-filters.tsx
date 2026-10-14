import Link from "next/link";
import { useTranslations } from "next-intl";

import type { VillageQuery } from "@/lib/api/villages";

const CRAFT_TYPES = [
  "conical_hat",
  "fish_sauce",
  "mat_weaving",
  "bamboo_rattan",
  "woodwork",
  "rice_wine",
  "noodles_cakes",
  "metalwork",
  "paper_fan",
  "broom",
  "food_specialty",
  "other",
] as const;
const REGIONS = ["quang_tri", "quang_binh"] as const;

/**
 * A plain GET form: filtering works without JavaScript and every result set keeps a
 * shareable URL.
 */
export function VillageFilters({ query }: { query: VillageQuery }) {
  const t = useTranslations();
  const selectClass = "rounded border border-stone-300 bg-white px-3 py-2 text-sm";

  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        {t("villages.search")}
        <input
          type="search"
          name="search"
          defaultValue={query.search ?? ""}
          placeholder={t("villages.searchPlaceholder")}
          className={`${selectClass} min-w-56`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("villages.craftType")}
        <select name="craft_type" defaultValue={query.craft_type ?? ""} className={selectClass}>
          <option value="">{t("villages.all")}</option>
          {CRAFT_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`craftType.${value}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("villages.region")}
        <select
          name="former_region"
          defaultValue={query.former_region ?? ""}
          className={selectClass}
        >
          <option value="">{t("villages.all")}</option>
          {REGIONS.map((value) => (
            <option key={value} value={value}>
              {t(`region.${value}`)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        {t("villages.filter")}
      </button>
      <Link href="/villages" className="px-2 py-2 text-sm text-stone-600 hover:text-emerald-700">
        {t("villages.reset")}
      </Link>
    </form>
  );
}
