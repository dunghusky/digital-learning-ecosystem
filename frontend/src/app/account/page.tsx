import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AccountView } from "@/components/account/account-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.account");
  return { title: t("title"), robots: { index: false } };
}

/** The session lives in the browser, so the page is a client view that redirects guests. */
export default function AccountPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <AccountView />
    </main>
  );
}
