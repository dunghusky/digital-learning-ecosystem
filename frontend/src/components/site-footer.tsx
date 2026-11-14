import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations();

  return (
    <footer className="border-t border-line bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-muted">
        <p className="font-semibold text-ink">{t("site.name")}</p>
        <p className="mt-1">{t("site.tagline")}</p>
        <p className="mt-4">{t("site.footer")}</p>
      </div>
    </footer>
  );
}
