import { type NextRequest, NextResponse } from "next/server";

import { fetchRandomDocumentSlug } from "@/lib/api/documents";

const FORWARDED_FILTERS = ["search", "genre", "grade_level", "village", "theme"] as const;

/**
 * `/archive/random?genre=riddle` redirects to one matching document picked by the backend.
 * A route rather than a client fetch so the 🎲 button is a plain link that works without JS.
 */
export async function GET(request: NextRequest) {
  const query = Object.fromEntries(
    FORWARDED_FILTERS.map((key) => [key, request.nextUrl.searchParams.get(key) ?? undefined]),
  );
  const slug = await fetchRandomDocumentSlug(query);
  const target = slug ? `/archive/${slug}` : "/archive";
  return NextResponse.redirect(new URL(target, request.url), 307);
}
