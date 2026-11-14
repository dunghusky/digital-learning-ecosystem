"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibre-setup";

import { MapPin } from "lucide-react";
import type { StyleSpecification } from "maplibre-gl";
import { useEffect, useState } from "react";
import { Map as MapGL, Marker, NavigationControl } from "react-map-gl/maplibre";

import { Skeleton } from "@/components/ui/skeleton";
import { CRAFT_META } from "@/lib/craft-meta";

import { type BasemapId, PROVINCE_BOUNDS } from "./map-config";
import { loadBasemapStyle } from "./map-style";
import type { MiniMapPlace } from "./mini-map-places";

/** Zoom used for a single village, and the cap when fitting several. */
const PLACE_ZOOM = 12;
/** Keeps the mini map on the province: no globe, no panning out to the sea. */
const MINI_MIN_ZOOM = 7;
const MINI_MAX_BOUNDS: [number, number, number, number] = [
  PROVINCE_BOUNDS[0][0] - 0.5,
  PROVINCE_BOUNDS[0][1] - 0.5,
  PROVINCE_BOUNDS[1][0] + 0.5,
  PROVINCE_BOUNDS[1][1] + 0.5,
];

function initialView(places: MiniMapPlace[]) {
  if (places.length === 1) {
    const [place] = places;
    return {
      longitude: place.longitude,
      latitude: place.latitude,
      zoom: PLACE_ZOOM,
    };
  }
  const lngs = places.map((place) => place.longitude);
  const lats = places.map((place) => place.latitude);
  return {
    bounds: [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]],
    fitBoundsOptions: { padding: 48, maxZoom: PLACE_ZOOM },
  };
}

/**
 * Small, flat map of a few villages. No 3D, no intro flight: it sits inside an article and
 * should load fast and stay calm. Scroll-zoom is off so the page keeps scrolling over it.
 */
export default function MiniMapCanvas({ places }: { places: MiniMapPlace[] }) {
  const [basemapId, setBasemapId] = useState<BasemapId>("map");
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBasemapStyle(basemapId)
      .then((style) => !cancelled && setMapStyle(style))
      .catch(() => !cancelled && setBasemapId("satellite"));
    return () => {
      cancelled = true;
    };
  }, [basemapId]);

  if (!mapStyle) {
    return <Skeleton className="h-full w-full rounded-none" />;
  }

  return (
    <MapGL
      mapStyle={mapStyle}
      initialViewState={initialView(places)}
      minZoom={MINI_MIN_ZOOM}
      maxBounds={MINI_MAX_BOUNDS}
      scrollZoom={false}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {places.map((place) => (
        <Marker
          key={place.code}
          longitude={place.longitude}
          latitude={place.latitude}
          anchor="bottom"
        >
          <span className="flex flex-col items-center" title={place.name}>
            <MapPin
              className="size-8 drop-shadow-md"
              fill={CRAFT_META[place.craftType].color}
              stroke="#ffffff"
              strokeWidth={1.5}
              aria-hidden
            />
            {places.length > 1 && (
              <span className="mt-0.5 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink shadow">
                {place.name}
              </span>
            )}
          </span>
        </Marker>
      ))}
    </MapGL>
  );
}
