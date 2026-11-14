"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth/auth-provider";
import { safeNextPath } from "@/lib/auth/session";

/** Sends a signed-in visitor away from the login and sign-up pages. Renders nothing. */
export function RedirectIfSignedIn({ next }: { next?: string }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "authenticated") {
      router.replace(safeNextPath(next));
    }
  }, [state.status, next, router]);

  return null;
}
