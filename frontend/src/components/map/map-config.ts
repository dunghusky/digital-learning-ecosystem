/**
 * Map constants. MapLibre takes coordinates as [longitude, latitude], the reverse of Leaflet
 * and of the latitude/longitude fields in the admin.
 */

type LngLat = [number, number];
type LngLatBounds = [LngLat, LngLat];

/**
 * Quang Tri after the 2025 merger. Keep in sync with PROVINCE_BOUNDS in
 * backend/apps/villages/models.py, which rejects coordinates outside this box.
 */
export const PROVINCE_BOUNDS: LngLatBounds = [
  [105.5, 16.0],
  [107.6, 18.2],
];

/** Opening view: the whole country including Hoang Sa and Truong Sa, before flying in. */
export const VIETNAM_VIEW = { longitude: 108.6, latitude: 15.9, zoom: 4.3 };

/** How far visitors may pan: Vietnam and its seas, as [west, south, east, north]. */
export const MAX_BOUNDS: [number, number, number, number] = [96.0, 4.0, 122.0, 25.5];

export const MIN_ZOOM = 3.5;
export const MAX_ZOOM = 18;

/** Camera tilt and rotation when 3D is on: enough to show the Truong Son range in relief. */
export const TILT_3D = { pitch: 55, bearing: -15 };
export const TERRAIN_EXAGGERATION = 1.5;
export const INTRO_DURATION_MS = 4000;

/**
 * Vietnam's sovereignty over the Hoang Sa and Truong Sa archipelagos must be shown whenever
 * the map is zoomed out; base map data alone does not guarantee it.
 */
export const ARCHIPELAGOS = [
  { id: "paracel", coordinates: [111.9, 16.4] as LngLat },
  { id: "spratly", coordinates: [114.0, 9.9] as LngLat },
] as const;

export type BasemapId = "map" | "satellite";

/** OpenFreeMap: free vector tiles, no API key, no usage limit. */
export const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
export const LABEL_FONT = ["Noto Sans Bold"];

export const SATELLITE_TILES = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics",
  maxzoom: 18,
};

/** Elevation tiles from the AWS Open Data terrain dataset (Terrarium encoding, no key). */
export const TERRAIN_TILES = {
  url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
  attribution: '<a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a>',
  maxzoom: 15,
};

/** Source id shared by the style builders and the `terrain` prop of the map. */
export const TERRAIN_SOURCE_ID = "terrain-dem";
