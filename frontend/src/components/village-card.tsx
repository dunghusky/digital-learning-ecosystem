import { MapPin } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { CraftBadge } from "@/components/craft-badge";
import type { VillageSummary } from "@/lib/api/villages";

export function VillageCard({ village }: { village: VillageSummary }) {
  const t = useTranslations();

  return (
    <li className="group rounded-xl border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md">
      <Link href={`/villages/${village.code}`} className="block">
        <CraftBadge craftType={village.craft_type} />
        <h2 className="mt-2 text-lg font-semibold text-emerald-900 group-hover:text-emerald-700">
          {village.name}
        </h2>
        <p className="mt-1 flex items-center gap-1 text-sm text-stone-600">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {[village.commune, t(`region.${village.former_region}`)].filter(Boolean).join(" · ")}
        </p>
        {village.short_description && (
          <p className="mt-2 line-clamp-3 text-sm text-stone-700">{village.short_description}</p>
        )}
      </Link>
    </li>
  );
}
