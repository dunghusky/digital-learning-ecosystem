import type { CraftType, VillageFeature } from "@/lib/api/villages";

/** Flat, serializable shape the map components work with (no GeoJSON nesting). */
export interface MapVillage {
  code: string;
  name: string;
  craftType: CraftType;
  commune: string;
  latitude: number;
  longitude: number;
}

/** Villages that can be placed on the map; the rest are listed separately as "not located". */
export function locatedVillages(features: VillageFeature[]): MapVillage[] {
  return features.flatMap((feature) => {
    if (!feature.geometry) {
      return [];
    }
    const [longitude, latitude] = feature.geometry.coordinates;
    return [
      {
        code: feature.id,
        name: feature.properties.name,
        craftType: feature.properties.craft_type,
        commune: feature.properties.commune,
        latitude,
        longitude,
      },
    ];
  });
}
