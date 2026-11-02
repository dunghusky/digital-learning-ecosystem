import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // public/vendor holds third-party files copied from node_modules (see scripts/).
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/vendor/**"]),
]);
