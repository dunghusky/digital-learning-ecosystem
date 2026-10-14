import Link from "next/link";
import { useTranslations } from "next-intl";

import type { VillageSummary } from "@/lib/api/villages";

export function VillageCard({ village }: { village: VillageSummary }) {
  const t = useTranslations();

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-emerald-600">
      <Link href={`/villages/${village.code}`} className="block">
        <h2 className="text-lg font-semibold text-emerald-900">{village.name}</h2>
        <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-stone-600">
          <span>{t(`craftType.${village.craft_type}`)}</span>
          <span>{t(`region.${village.former_region}`)}</span>
          {village.commune && <span>{village.commune}</span>}
        </p>
        {village.short_description && (
          <p className="mt-2 line-clamp-3 text-sm text-stone-700">{village.short_description}</p>
        )}
      </Link>
    </li>
  );
}
