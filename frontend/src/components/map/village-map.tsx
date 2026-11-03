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

export function VillageMap({ villages }: { villages: MapVillage[] }) {
  return <MaplibreMap villages={villages} />;
}
