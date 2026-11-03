"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shared body for route-level `error.tsx` files: the backend being unreachable is the usual
 * cause, so offer a retry instead of a dead end.
 */
export function RouteError({ reset }: { reset: () => void }) {
  const t = useTranslations("error");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <EmptyState
        icon={CloudOff}
        title={t("title")}
        hint={t("loadFailed")}
        action={
          <button type="button" onClick={reset} className={buttonClass("primary", "text-sm")}>
            {t("retry")}
          </button>
        }
      />
    </main>
  );
}
