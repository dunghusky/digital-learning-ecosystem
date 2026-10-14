"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shared body for route-level `error.tsx` files: the backend being unreachable is the usual
 * cause, so offer a retry instead of a dead end.
 */
export function RouteError({ reset }: { reset: () => void }) {
  const t = useTranslations("error");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <EmptyState
        icon={CloudOff}
        title={t("title")}
        hint={t("loadFailed")}
        action={
          <button
            type="button"
            onClick={reset}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {t("retry")}
          </button>
        }
      />
    </main>
  );
}
