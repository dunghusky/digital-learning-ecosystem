"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

import type { MiniMapPlace } from "./mini-map-places";

// Browser only (WebGL), and kept off pages without a map.
const MiniMapCanvas = dynamic(() => import("./mini-map-canvas"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

/**
 * Embedded map of one or a few villages, with a link to open the first one on the full map.
 * Renders nothing when none of the villages is located yet.
 */
export function MiniMap({
  places,
  className = "",
}: {
  places: MiniMapPlace[];
  className?: string;
}) {
  const t = useTranslations("map.mini");
  if (places.length === 0) {
    return null;
  }

  return (
    <figure className={className}>
      <div
        role="region"
        aria-label={t("label", {
          names: places.map((place) => place.name).join(", "),
        })}
        className="h-64 overflow-hidden rounded-card border border-line shadow-card sm:h-72"
      >
        <MiniMapCanvas places={places} />
      </div>
      <figcaption className="mt-2 text-right">
        <Link
          href={`/map?village=${places[0].code}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {t("openFull")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </figcaption>
    </figure>
  );
}
