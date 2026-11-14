"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Map as MapIcon, Mountain, Satellite } from "lucide-react";
import "./maplibre-setup";

import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layer,
  type LayerProps,
  Map as MapGL,
  type MapLayerMouseEvent,
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
import { VillagePopup } from "./village-popup";

/** Never zoom in further than this when fitting the villages (one village would fill the screen). */
const FIT_MAX_ZOOM = 11;
/** Zoom when flying to one village (from a click or from `/map?village=…`). */
const VILLAGE_ZOOM = 13;
const FLAT = { pitch: 0, bearing: 0 };
const VILLAGE_DOTS_ID = "village-dots";

const CRAFT_COLOR: ExpressionSpecification = [
  "match",
  ["get", "craftType"],
  ...CRAFT_TYPES.flatMap((craft) => [craft, CRAFT_META[craft].color]),
  CRAFT_META.other.color,
] as unknown as ExpressionSpecification; // built dynamically, so TypeScript cannot check the shape

// Temporary village dots; step 1.4d replaces them with animated markers and clusters.
const villageDots: LayerProps = {
  id: VILLAGE_DOTS_ID,
  type: "circle",
  paint: {
    "circle-color": CRAFT_COLOR,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 12, 9],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
};

/** Ring drawn around the selected village (none when `code` is null). */
const selectedRing = (code: string | null): LayerProps => ({
  id: "village-selected",
  type: "circle",
  filter: ["==", ["get", "code"], code ?? ""],
  paint: {
    "circle-color": "rgba(0,0,0,0)",
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 10, 12, 15],
    "circle-stroke-color": CRAFT_COLOR,
    "circle-stroke-width": 3,
  },
});

/** Keeps `?village=` in the address bar in step with the card, without a navigation. */
function syncVillageParam(code: string | null) {
  const url = new URL(window.location.href);
  if (code) {
    url.searchParams.set("village", code);
  } else {
    url.searchParams.delete("village");
  }
  window.history.replaceState(window.history.state, "", url);
}

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
export default function MaplibreMap({
  villages,
  initialCode,
}: {
  villages: MapVillage[];
  initialCode?: string;
}) {
  const t = useTranslations("map");
  const mapRef = useRef<MapRef>(null);
  const [basemapId, setBasemapId] = useState<BasemapId>("map");
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [is3d, setIs3d] = useState(true);
  // An unknown or not-yet-located code is ignored: the map simply opens on every village.
  const [selectedCode, setSelectedCode] = useState<string | null>(
    () => villages.find((village) => village.code === initialCode)?.code ?? null,
  );
  const [hovering, setHovering] = useState(false);
  const selected = villages.find((village) => village.code === selectedCode) ?? null;

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

  const tilt = is3d ? TILT_3D : FLAT;

  /** Opening shot: from the whole country down to the chosen village, or to all of them. */
  const flyToVillages = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    // Not `essential`: MapLibre turns it into a jump for visitors who prefer reduced motion.
    const flight = { ...(is3d ? TILT_3D : FLAT), duration: INTRO_DURATION_MS, curve: 1.6 };
    if (selected) {
      map.flyTo({ center: [selected.longitude, selected.latitude], zoom: VILLAGE_ZOOM, ...flight });
      return;
    }
    const camera = map.cameraForBounds(boundsOf(villages) ?? PROVINCE_BOUNDS, {
      padding: 60,
      maxZoom: FIT_MAX_ZOOM,
    });
    if (camera) {
      map.flyTo({ ...camera, ...flight });
    }
    // Only the opening shot uses this; later selections must not re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villages, is3d]);

  const selectVillage = (village: MapVillage | null) => {
    setSelectedCode(village?.code ?? null);
    syncVillageParam(village?.code ?? null);
    if (village) {
      const zoom = Math.max(mapRef.current?.getZoom() ?? 0, FIT_MAX_ZOOM);
      mapRef.current?.flyTo({
        center: [village.longitude, village.latitude],
        zoom,
        ...tilt,
        duration: 1200,
      });
    }
  };

  const handleClick = (event: MapLayerMouseEvent) => {
    const code = event.features?.[0]?.properties?.code;
    // A click on empty map closes the card; a click on a dot opens that village.
    selectVillage(villages.find((village) => village.code === code) ?? null);
  };

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
        interactiveLayerIds={[VILLAGE_DOTS_ID]}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        cursor={hovering ? "pointer" : "grab"}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" visualizePitch />
        <Source id="archipelagos" type="geojson" data={archipelagoData}>
          <Layer {...archipelagoLabels} />
        </Source>
        <Source id="villages" type="geojson" data={villageData}>
          <Layer {...villageDots} />
          <Layer {...selectedRing(selectedCode)} />
          <Layer {...villageNames} />
        </Source>
        {selected && <VillagePopup village={selected} onClose={() => selectVillage(null)} />}
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
