"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";

import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { CurrentUser } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-provider";

/** Teachers give assignments; school admins may act as teachers, as on the backend. */
export const isTeacher = (user: CurrentUser) =>
  user.role === "teacher" || user.role === "school_admin";

export const isStudent = (user: CurrentUser) => user.role === "student";

/**
 * Renders `children` only for a signed-in user that `allow` accepts. Guests are sent to the
 * login page and come back to `next`; other roles see a short explanation instead.
 */
export function RoleGate({
  allow,
  next,
  deniedMessage,
  children,
}: {
  allow: (user: CurrentUser) => boolean;
  next: string;
  deniedMessage: string;
  children: (user: CurrentUser) => ReactNode;
}) {
  const t = useTranslations("classwork");
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [state.status, next, router]);

  if (state.status !== "authenticated") {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    );
  }
  if (!allow(state.user)) {
    return (
      <EmptyState
        icon={Lock}
        title={t("denied")}
        hint={deniedMessage}
        action={
          <Link href="/lessons" className={buttonClass("outline", "text-sm")}>
            {t("toLessons")}
          </Link>
        }
      />
    );
  }
  return children(state.user);
}
