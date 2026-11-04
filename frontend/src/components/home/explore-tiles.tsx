import { ArrowUpRight, BookOpen, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const TILES: {
  key: "map" | "archive";
  href: string;
  icon: LucideIcon;
  tint: string;
  accent: string;
}[] = [
  {
    key: "map",
    href: "/map",
    icon: Map,
    tint: "bg-primary-soft",
    accent: "bg-primary",
  },
  {
    key: "archive",
    href: "/archive",
    icon: BookOpen,
    tint: "bg-indigo-soft",
    accent: "bg-indigo",
  },
];

/** The two big doors of the site: the village map and the archive of folk documents. */
export function ExploreTiles({
  stats,
}: {
  stats: { villages: number; documents: number };
}) {
  const t = useTranslations("home.explore");

  return (
    <ul className="grid h-full gap-5">
      {TILES.map(({ key, href, icon: Icon, tint, accent }) => (
        <li key={key}>
          <Link
            href={href}
            className={`group flex h-full items-center gap-5 rounded-card border border-line p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover sm:p-7 ${tint}`}
          >
            <span
              className={`grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:scale-105 ${accent}`}
              aria-hidden
            >
              <Icon className="size-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-bold text-ink">
                {t(`${key}.title`)}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
                {t(`${key}.text`, {
                  count: key === "map" ? stats.villages : stats.documents,
                })}
              </span>
            </span>
            <ArrowUpRight
              className="size-6 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
