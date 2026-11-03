import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DocumentSummary } from "@/lib/api/documents";
import { GENRE_META } from "@/lib/genre-meta";

/* Small pieces shared by the archive cards, server and client alike. */

export function GenreLabel({ document }: { document: DocumentSummary }) {
  const t = useTranslations("genre");
  const { icon: Icon, color } = GENRE_META[document.genre];
  return (
    <p
      className="inline-flex items-center gap-1.5 text-sm font-semibold"
      style={{ color: `color-mix(in oklab, ${color} 80%, black)` }}
    >
      <Icon className="size-4" aria-hidden />
      {t(document.genre)}
    </p>
  );
}

export function VillageLine({ document }: { document: DocumentSummary }) {
  if (document.villages.length === 0) {
    return null;
  }
  return (
    <p className="flex items-center gap-1 text-sm text-ink-muted">
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {document.villages.map((village) => village.name).join(", ")}
      </span>
    </p>
  );
}
