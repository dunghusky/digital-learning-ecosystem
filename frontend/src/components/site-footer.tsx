import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations();

  return (
    <footer className="mt-12 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-stone-600">
        <p className="font-medium">{t("site.tagline")}</p>
        <p className="mt-1">{t("site.footer")}</p>
      </div>
    </footer>
  );
}
