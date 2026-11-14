import { getTranslations } from "next-intl/server";

import type { SceneVerse } from "@/components/auth/auth-scene";
import { fetchFeaturedDocument } from "@/lib/api/documents";

/**
 * Today's folk verse from the archive for the auth pages, so signing in starts with a
 * piece of literature. A login page must never fail because of the archive, so any error
 * falls back to a well-known proverb about respecting teachers.
 */
export async function loadSceneVerse(): Promise<SceneVerse> {
  const featured = await fetchFeaturedDocument("folk_verse").catch(() => null);
  const lines = featured?.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (featured && lines?.length) {
    return { lines, title: featured.title, slug: featured.slug };
  }

  const t = await getTranslations("auth.scene");
  return {
    lines: t.raw("fallbackLines") as string[],
    title: t("fallbackTitle"),
  };
}
