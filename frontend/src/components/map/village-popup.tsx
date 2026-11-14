"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Popup } from "react-map-gl/maplibre";

import { CraftBadge } from "@/components/craft-badge";

import type { MapVillage } from "./map-villages";

/** Quick-look card over the selected village: craft, place, and links to its profile and documents. */
export function VillagePopup({ village, onClose }: { village: MapVillage; onClose: () => void }) {
  const t = useTranslations("map.popup");

  return (
    <Popup
      longitude={village.longitude}
      latitude={village.latitude}
      anchor="bottom"
      offset={14}
      maxWidth="280px"
      closeOnClick={false}
      onClose={onClose}
    >
      <div className="space-y-2 pr-4 font-sans">
        <CraftBadge craftType={village.craftType} />
        <h3 className="text-base leading-snug font-bold text-ink">{village.name}</h3>
        {village.commune && <p className="text-xs text-ink-muted">{village.commune}</p>}
        {village.shortDescription && (
          <p className="line-clamp-3 text-sm text-ink/90">{village.shortDescription}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm font-semibold">
          <Link
            href={`/villages/${village.code}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {t("viewProfile")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {village.documentCount > 0 && (
            <Link
              href={`/archive?village=${village.code}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <BookOpen className="size-4" aria-hidden />
              {t("documents", { count: village.documentCount })}
            </Link>
          )}
        </div>
      </div>
    </Popup>
  );
}
