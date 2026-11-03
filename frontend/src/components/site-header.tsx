import Link from "next/link";
import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-ink">
          <span
            className="grid size-9 place-items-center rounded-xl bg-ink text-sm font-extrabold text-primary-soft"
            aria-hidden
          >
            LN
          </span>
          <span className="hidden sm:inline">{t("site.name")}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-ink-muted sm:gap-4">
          <Link href="/villages" className="rounded-full px-3 py-2 hover:text-ink">
            {t("nav.villages")}
          </Link>
          <Link href="/map" className="rounded-full px-3 py-2 hover:text-ink">
            {t("nav.map")}
          </Link>
          <Link href="/archive" className="rounded-full px-3 py-2 hover:text-ink">
            {t("nav.archive")}
          </Link>
        </nav>
        <ButtonLink href="/villages" className="hidden text-sm md:inline-flex">
          {t("nav.explore")}
        </ButtonLink>
      </div>
    </header>
  );
}
