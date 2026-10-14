/**
 * Server components fetch through the Docker network (API_URL), the browser through the
 * public host name (NEXT_PUBLIC_API_URL).
 */
const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Public content changes rarely; cache it instead of hitting the backend on every request. */
const DEFAULT_REVALIDATE_SECONDS = 300;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type QueryParams = Record<string, string | number | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  { params, revalidate = DEFAULT_REVALIDATE_SECONDS }: { params?: QueryParams; revalidate?: number } = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API ${path} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}
