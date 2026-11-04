"use client";

import { ChevronDown, LogOut, School, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/auth-provider";

/**
 * Header slot for the session: a placeholder while the browser session is read, the
 * "Log in" link when signed out, and the user's name with a small menu when signed in.
 */
export function AccountMenu() {
  const t = useTranslations();
  const { state, signOut } = useAuth();
  const router = useRouter();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (state.status === "loading") {
    return (
      <span aria-hidden className="block h-10 w-24 animate-pulse rounded-full bg-surface-muted" />
    );
  }

  if (state.status === "anonymous") {
    return (
      <Link
        href="/login"
        className="rounded-full px-3 py-2 text-sm font-semibold text-ink hover:text-primary"
      >
        {t("nav.login")}
      </Link>
    );
  }

  const { user } = state;
  const school = [
    user.class_name && t("account.classLabel", { name: user.class_name }),
    user.school_name,
  ]
    .filter(Boolean)
    .join(" · ");

  async function onSignOut() {
    setOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm font-semibold text-ink transition hover:border-primary"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-primary-soft font-bold text-primary-strong uppercase"
        >
          {user.display_name.charAt(0)}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{user.display_name}</span>
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 mt-2 w-64 animate-rise rounded-2xl border border-line bg-surface p-2 shadow-card-hover [animation-duration:0.25s]"
        >
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="truncate font-semibold text-ink">{user.display_name}</p>
            {school && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                <School className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="min-w-0">{school}</span>
              </p>
            )}
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted hover:text-primary-strong"
          >
            <UserRound className="size-4" aria-hidden />
            {t("account.myAccount")}
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-surface-muted hover:text-primary-strong"
          >
            <LogOut className="size-4" aria-hidden />
            {t("account.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
