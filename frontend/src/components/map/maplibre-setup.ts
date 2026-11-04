import { getVersion, setWorkerUrl } from "maplibre-gl";

// Served from public/ (copied by scripts/copy-maplibre-worker.mjs): MapLibre cannot find its
// worker next to the bundled library. The version busts the browser cache after upgrades.
// Imported for its side effect by every map component.
setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${getVersion()}`);
