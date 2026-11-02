import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from "maplibre-gl";

import {
  type BasemapId,
  GLYPHS_URL,
  SATELLITE_TILES,
  TERRAIN_SOURCE_ID,
  TERRAIN_TILES,
  VECTOR_STYLE_URL,
} from "./map-config";

/**
 * Base map styles. The vector style is downloaded and adapted rather than used as is:
 * labels are switched to Vietnamese and the disputed-boundary layer is removed (see
 * ARCHIPELAGOS in map-config for the sovereignty labels added on top). Both styles carry the
 * elevation source, so 3D terrain keeps working when the visitor switches base map.
 */

/** Vietnamese name when OSM has one, then the Latin-script name, then the local name. */
const VIETNAMESE_NAME: ExpressionSpecification = [
  "coalesce",
  ["get", "name:vi"],
  ["get", "name:latin"],
  ["get", "name"],
];

/** Layers whose text uses a name (not a road number etc.) and should be read in Vietnamese. */
function isNameLabel(layer: LayerSpecification): boolean {
  if (layer.type !== "symbol") {
    return false;
  }
  const textField = JSON.stringify(layer.layout?.["text-field"] ?? "");
  return textField.includes('"name');
}

const terrainSource: SourceSpecification = {
  type: "raster-dem",
  tiles: [TERRAIN_TILES.url],
  encoding: "terrarium",
  tileSize: 256,
  maxzoom: TERRAIN_TILES.maxzoom,
  attribution: TERRAIN_TILES.attribution,
};

/** Soft shading of slopes, so mountains read as relief even when the map is flat. */
const hillshadeLayer: LayerSpecification = {
  id: "hillshade",
  type: "hillshade",
  source: TERRAIN_SOURCE_ID,
  paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#3f3f46" },
};

export function adaptVectorStyle(style: StyleSpecification): StyleSpecification {
  const layers = style.layers
    .filter((layer) => layer.id !== "boundary_disputed")
    .map((layer) =>
      isNameLabel(layer)
        ? ({
            ...layer,
            layout: { ...layer.layout, "text-field": VIETNAMESE_NAME },
          } as LayerSpecification)
        : layer,
    );
  // Shade the ground under roads and labels: insert before the first symbol layer.
  const firstSymbol = layers.findIndex((layer) => layer.type === "symbol");
  const insertAt = firstSymbol === -1 ? layers.length : firstSymbol;
  layers.splice(insertAt, 0, hillshadeLayer);

  return {
    ...style,
    sources: { ...style.sources, [TERRAIN_SOURCE_ID]: terrainSource },
    layers,
  };
}

const satelliteStyle: StyleSpecification = {
  version: 8,
  // Needed by the symbol layers drawn on top (village names, archipelago labels).
  glyphs: GLYPHS_URL,
  sources: {
    satellite: {
      type: "raster",
      tiles: [SATELLITE_TILES.url],
      tileSize: 256,
      maxzoom: SATELLITE_TILES.maxzoom,
      attribution: SATELLITE_TILES.attribution,
    },
    [TERRAIN_SOURCE_ID]: terrainSource,
  },
  layers: [{ id: "satellite", type: "raster", source: "satellite" }],
};

const vectorStyle: { promise?: Promise<StyleSpecification> } = {};

/** Resolves the style for a base map; the vector style is fetched once per page load. */
export function loadBasemapStyle(id: BasemapId): Promise<StyleSpecification> {
  if (id === "satellite") {
    return Promise.resolve(satelliteStyle);
  }
  vectorStyle.promise ??= fetch(VECTOR_STYLE_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Map style request failed with status ${response.status}`);
      }
      return response.json() as Promise<StyleSpecification>;
    })
    .then(adaptVectorStyle)
    .catch((error: unknown) => {
      vectorStyle.promise = undefined; // allow a retry on the next switch
      throw error;
    });
  return vectorStyle.promise;
}
