"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Map as MapIcon, Mountain, Satellite } from "lucide-react";
import {
  type ExpressionSpecification,
  getVersion,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layer,
  type LayerProps,
  Map as MapGL,
  type MapRef,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";

import { Skeleton } from "@/components/ui/skeleton";
import { CRAFT_META, CRAFT_TYPES } from "@/lib/craft-meta";

import {
  ARCHIPELAGOS,
  type BasemapId,
  INTRO_DURATION_MS,
  LABEL_FONT,
  MAX_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
  PROVINCE_BOUNDS,
  TERRAIN_EXAGGERATION,
  TERRAIN_SOURCE_ID,
  TILT_3D,
  VIETNAM_VIEW,
} from "./map-config";
import { loadBasemapStyle } from "./map-style";
import type { MapVillage } from "./map-villages";

// Served from public/ (copied by scripts/copy-maplibre-worker.mjs): MapLibre cannot find its
// worker next to the bundled library. The version busts the browser cache after upgrades.
setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${getVersion()}`);

/** Never zoom in further than this when fitting the villages (one village would fill the screen). */
const FIT_MAX_ZOOM = 11;
const FLAT = { pitch: 0, bearing: 0 };

const CRAFT_COLOR: ExpressionSpecification = [
  "match",
  ["get", "craftType"],
  ...CRAFT_TYPES.flatMap((craft) => [craft, CRAFT_META[craft].color]),
  CRAFT_META.other.color,
] as unknown as ExpressionSpecification; // built dynamically, so TypeScript cannot check the shape

// Temporary village dots; step 1.4d replaces them with animated markers and clusters.
const villageDots: LayerProps = {
  id: "village-dots",
  type: "circle",
  paint: {
    "circle-color": CRAFT_COLOR,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 12, 9],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
};

const villageNames: LayerProps = {
  id: "village-names",
  type: "symbol",
  minzoom: 9,
  layout: {
    "text-field": ["get", "name"],
    "text-font": LABEL_FONT,
    "text-size": 13,
    "text-offset": [0, 1.2],
    "text-anchor": "top",
  },
  paint: { "text-color": "#064e3b", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
};

const archipelagoLabels: LayerProps = {
  id: "archipelago-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "label"],
    "text-font": LABEL_FONT,
    "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 7, 15],
    "text-allow-overlap": true,
  },
  paint: { "text-color": "#0f766e", "text-halo-color": "#ffffff", "text-halo-width": 2 },
};

type Bounds = [[number, number], [number, number]];

function boundsOf(villages: MapVillage[]): Bounds | null {
  if (villages.length === 0) {
    return null;
  }
  const lngs = villages.map((village) => village.longitude);
  const lats = villages.map((village) => village.latitude);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/**
 * 3D map of the villages. Opens on a globe view of Vietnam, then flies down to the villages.
 * Loaded only in the browser (see `VillageMap`): MapLibre needs WebGL and `window`.
 */
export default function MaplibreMap({ villages }: { villages: MapVillage[] }) {
  const t = useTranslations("map");
  const mapRef = useRef<MapRef>(null);
  const [basemapId, setBasemapId] = useState<BasemapId>("map");
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [is3d, setIs3d] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadBasemapStyle(basemapId)
      .then((style) => !cancelled && setMapStyle(style))
      // The vector tiles are unreachable (network, DNS): fall back to satellite imagery.
      .catch(() => !cancelled && setBasemapId("satellite"));
    return () => {
      cancelled = true;
    };
  }, [basemapId]);

  const villageData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: villages.map((village) => ({
        type: "Feature" as const,
        properties: { code: village.code, name: village.name, craftType: village.craftType },
        geometry: { type: "Point" as const, coordinates: [village.longitude, village.latitude] },
      })),
    }),
    [villages],
  );

  const archipelagoData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: ARCHIPELAGOS.map(({ id, coordinates }) => ({
        type: "Feature" as const,
        properties: { label: t(`archipelago.${id}`) },
        geometry: { type: "Point" as const, coordinates },
      })),
    }),
    [t],
  );

  /** Opening shot: from the whole country down to the villages (or the province). */
  const flyToVillages = useCallback(() => {
    const map = mapRef.current;
    const camera = map?.cameraForBounds(boundsOf(villages) ?? PROVINCE_BOUNDS, {
      padding: 60,
      maxZoom: FIT_MAX_ZOOM,
    });
    if (!map || !camera) {
      return;
    }
    // Not `essential`: MapLibre turns it into a jump for visitors who prefer reduced motion.
    map.flyTo({ ...camera, ...(is3d ? TILT_3D : FLAT), duration: INTRO_DURATION_MS, curve: 1.6 });
  }, [villages, is3d]);

  const toggle3d = () => {
    const next = !is3d;
    setIs3d(next);
    mapRef.current?.easeTo({ ...(next ? TILT_3D : FLAT), duration: 1000 });
  };

  const terrain = is3d
    ? { source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION }
    : undefined; // undefined removes the terrain

  if (!mapStyle) {
    return <Skeleton className="h-full w-full rounded-none" />;
  }

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={VIETNAM_VIEW}
        projection="globe"
        terrain={terrain}
        maxBounds={MAX_BOUNDS}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxPitch={70}
        onLoad={flyToVillages}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" visualizePitch />
        <Source id="archipelagos" type="geojson" data={archipelagoData}>
          <Layer {...archipelagoLabels} />
        </Source>
        <Source id="villages" type="geojson" data={villageData}>
          <Layer {...villageDots} />
          <Layer {...villageNames} />
        </Source>
      </MapGL>

      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <BasemapToggle value={basemapId} onChange={setBasemapId} />
        <button
          type="button"
          onClick={toggle3d}
          aria-pressed={is3d}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium shadow-md transition ${
            is3d ? "bg-emerald-700 text-white" : "bg-white text-stone-700 hover:bg-stone-100"
          }`}
        >
          <Mountain className="size-4" aria-hidden />
          {t("terrain3d")}
        </button>
      </div>
    </div>
  );
}

function BasemapToggle({
  value,
  onChange,
}: {
  value: BasemapId;
  onChange: (value: BasemapId) => void;
}) {
  const t = useTranslations("map.basemap");
  const options = [
    { id: "map", icon: MapIcon },
    { id: "satellite", icon: Satellite },
  ] as const;

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className="flex rounded-full bg-white p-1 shadow-md"
    >
      {options.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            value === id ? "bg-emerald-700 text-white" : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <Icon className="size-4" aria-hidden />
          {t(id)}
        </button>
      ))}
    </div>
  );
}
