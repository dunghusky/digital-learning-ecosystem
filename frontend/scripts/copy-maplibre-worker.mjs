/**
 * MapLibre GL 6 loads its web worker from a separate file next to the library. Bundlers
 * (Turbopack) move the library into their own chunks, so that file is never found. Copy it
 * into public/ instead; the map points MapLibre at it with setWorkerUrl().
 *
 * Runs after every `npm install` / `npm ci` and before each build, so the worker always
 * matches the installed library version.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageDir = dirname(require.resolve("maplibre-gl/package.json"));
const source = join(packageDir, "dist/maplibre-gl-worker.mjs");
const targetDir = join(dirname(fileURLToPath(import.meta.url)), "../public/vendor");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, "maplibre-gl-worker.mjs"));
