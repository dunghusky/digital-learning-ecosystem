import { MapPin } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { VillageSummary } from "@/lib/api/villages";
import { CRAFT_META } from "@/lib/craft-meta";

export function VillageCard({ village }: { village: VillageSummary }) {
  const t = useTranslations();
  const { icon: Icon, color } = CRAFT_META[village.craft_type];

  return (
    <Link
      href={`/villages/${village.code}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div
        className="flex items-center gap-3 border-b border-line/60 px-5 py-4"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 12%, white)` }}
      >
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm transition duration-300 group-hover:scale-105 group-hover:-rotate-3"
          style={{ backgroundColor: color }}
          aria-hidden
        >
          <Icon className="size-6" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 text-sm">
          <p
            className="font-semibold"
            style={{ color: `color-mix(in oklab, ${color} 75%, black)` }}
          >
            {t(`craftType.${village.craft_type}`)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-ink-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {[village.commune, t(`region.${village.former_region}`)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-5">
        <h3 className="text-lg font-bold text-ink transition group-hover:text-primary">
          {village.name}
        </h3>
        {village.short_description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {village.short_description}
          </p>
        )}
        {village.main_products && (
          <dl className="mt-auto pt-5 text-sm">
            <div className="border-t border-line pt-4">
              <dt className="text-ink-muted">{t("village.products")}</dt>
              <dd className="mt-0.5 line-clamp-1 font-semibold text-ink">
                {village.main_products}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </Link>
  );
}
