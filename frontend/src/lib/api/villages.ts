import { ApiError, apiFetch, type Paginated } from "./client";

export type CraftType =
  | "conical_hat"
  | "fish_sauce"
  | "mat_weaving"
  | "bamboo_rattan"
  | "woodwork"
  | "rice_wine"
  | "noodles_cakes"
  | "metalwork"
  | "paper_fan"
  | "broom"
  | "food_specialty"
  | "other";

export type RecognitionStatus =
  | "traditional_village"
  | "village"
  | "traditional_craft"
  | "not_recognized"
  | "unknown";

export type FormerRegion = "quang_tri" | "quang_binh";

export interface VillageSummary {
  code: string;
  name: string;
  craft_type: CraftType;
  main_products: string;
  former_region: FormerRegion;
  commune: string;
  latitude: string | null;
  longitude: string | null;
  short_description: string;
}

export interface VillageDetail extends VillageSummary {
  recognition_status: RecognitionStatus;
  recognition_decision: string;
  recognition_year: number | null;
  hamlet: string;
  former_commune: string;
  former_district: string;
  history: string;
  production_process: string;
  current_situation: string;
  culture: string;
  visitor_info: string;
  contact: string;
  sources: string;
  published_at: string | null;
  updated_at: string;
}

export interface VillageQuery {
  search?: string;
  craft_type?: string;
  former_region?: string;
  page?: number;
  page_size?: number;
}

export function fetchVillages(query: VillageQuery = {}): Promise<Paginated<VillageSummary>> {
  return apiFetch<Paginated<VillageSummary>>("/villages/", { params: { ...query } });
}

/** GeoJSON Feature from `/villages/map/`; `geometry` is null until coordinates are entered. */
export interface VillageFeature {
  type: "Feature";
  /** The village code. */
  id: string;
  /** GeoJSON order: [longitude, latitude]. */
  geometry: { type: "Point"; coordinates: [number, number] } | null;
  properties: Pick<
    VillageSummary,
    "name" | "craft_type" | "former_region" | "commune" | "main_products" | "short_description"
  > & {
    /** Published archive documents about the village. */
    document_count: number;
  };
}

export interface VillageFeatureCollection {
  type: "FeatureCollection";
  features: VillageFeature[];
}

/** Every published village in one response, for the map. */
export function fetchVillageMap(): Promise<VillageFeatureCollection> {
  return apiFetch<VillageFeatureCollection>("/villages/map/");
}

/** Returns null when the village does not exist or has not been published yet. */
export async function fetchVillage(code: string): Promise<VillageDetail | null> {
  try {
    return await apiFetch<VillageDetail>(`/villages/${code}/`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
