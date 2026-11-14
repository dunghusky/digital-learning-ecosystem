"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { MapVillage } from "./map-villages";

// MapLibre needs WebGL and `window`, so the map is rendered in the browser only. Splitting it
// out also keeps MapLibre (~250 kB gzipped) off every page that does not show a map.
const MaplibreMap = dynamic(() => import("./maplibre-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

/** `initialCode` comes from `/map?village=…`: the map opens on that village with its card shown. */
export function VillageMap({
  villages,
  initialCode,
}: {
  villages: MapVillage[];
  initialCode?: string;
}) {
  return <MaplibreMap villages={villages} initialCode={initialCode} />;
}
