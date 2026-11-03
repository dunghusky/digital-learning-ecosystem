import { useTranslations } from "next-intl";

import { HERO_PHOTOS } from "@/components/home/hero-photos";

/** Attribution required by the Creative Commons licenses of the hero photos. */
export function PhotoCredits() {
  const t = useTranslations("home");

  return (
    <details className="mx-auto max-w-6xl px-4 text-xs text-ink-muted">
      <summary className="cursor-pointer select-none hover:text-ink">{t("photoCredits")}</summary>
      <ul className="mt-2 space-y-1">
        {HERO_PHOTOS.map((photo) => (
          <li key={photo.key}>
            {t(`photos.${photo.key}`)}:{" "}
            <a href={photo.sourceUrl} className="underline hover:text-primary" rel="noopener">
              {photo.author}
            </a>
            , {photo.license}, Wikimedia Commons
          </li>
        ))}
      </ul>
    </details>
  );
}
