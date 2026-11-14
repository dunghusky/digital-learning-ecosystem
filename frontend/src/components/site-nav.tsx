"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV_ITEMS = [
  { href: "/villages", label: "nav.villages" },
  { href: "/map", label: "nav.map" },
  { href: "/archive", label: "nav.archive" },
  { href: "/lessons", label: "nav.lessons" },
  { href: "/quizzes", label: "nav.quizzes" },
] as const;

/** A section stays highlighted on its detail pages too: /villages/tra-loc lights "Làng nghề". */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 items-center overflow-x-auto text-sm font-medium whitespace-nowrap text-ink-muted [scrollbar-width:none] sm:gap-4">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-2 py-2 transition-colors sm:px-3 ${
              active ? "bg-primary-soft font-semibold text-primary" : "hover:text-ink"
            }`}
          >
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
