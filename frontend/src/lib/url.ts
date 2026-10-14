export type SearchParamValues = Record<string, string | number | undefined>;

/**
 * Builds a relative link with a query string, dropping empty values so URLs stay short and
 * shareable (`/villages?craft_type=fish_sauce` rather than `/villages?search=&page=1`).
 * Page 1 is the default everywhere, so it is dropped too.
 */
export function buildHref(path: string, params: SearchParamValues): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || (key === "page" && Number(value) === 1)) {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
