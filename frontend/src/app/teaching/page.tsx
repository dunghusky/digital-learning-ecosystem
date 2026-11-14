import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TeachingView } from "@/components/classwork/teaching-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("classwork.teaching");
  return { title: t("title"), robots: { index: false } };
}

/** The session lives in the browser, so the page is a client view that redirects guests. */
export default function TeachingPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <TeachingView />
    </main>
  );
}
