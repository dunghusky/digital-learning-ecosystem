import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Site-wide 404, also shown when a village or document is unpublished or missing. */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <EmptyState
        icon={Compass}
        title={t("title")}
        hint={t("hint")}
        action={<ButtonLink href="/">{t("home")}</ButtonLink>}
      />
    </main>
  );
}
