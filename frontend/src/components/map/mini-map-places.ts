// Plain module (no "use client"): server pages build the places before rendering the map.

import type { CraftType } from "@/lib/api/villages";

/** A village to pin on the mini map. Build it with `toMiniMapPlaces`. */
export interface MiniMapPlace {
  code: string;
  name: string;
  craftType: CraftType;
  latitude: number;
  longitude: number;
}

interface PlaceInput {
  code: string;
  name: string;
  craft_type: CraftType;
  latitude: number | string | null;
  longitude: number | string | null;
}

/**
 * Keeps the villages that have coordinates. Accepts both API shapes: numbers (document
 * detail) and decimal strings (village detail).
 */
export function toMiniMapPlaces(villages: PlaceInput[]): MiniMapPlace[] {
  return villages.flatMap((village) => {
    if (village.latitude === null || village.longitude === null) {
      return [];
    }
    return [
      {
        code: village.code,
        name: village.name,
        craftType: village.craft_type,
        latitude: Number(village.latitude),
        longitude: Number(village.longitude),
      },
    ];
  });
}
