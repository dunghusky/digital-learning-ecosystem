import Link from "next/link";
import { useTranslations } from "next-intl";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4">
        <Link href="/" className="text-lg font-bold text-emerald-800">
          {t("site.name")}
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:text-emerald-700">
            {t("nav.home")}
          </Link>
          <Link href="/villages" className="hover:text-emerald-700">
            {t("nav.villages")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
