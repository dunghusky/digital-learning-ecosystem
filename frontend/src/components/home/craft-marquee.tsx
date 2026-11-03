import Link from "next/link";
import { useTranslations } from "next-intl";

import { CRAFT_META, CRAFT_TYPES } from "@/lib/craft-meta";

const CRAFTS = CRAFT_TYPES.filter((craft) => craft !== "other");

/**
 * Endless strip of craft tiles. The list is rendered twice and the track slides by exactly
 * half its width, so the loop has no visible seam. Hovering pauses it. Tiles are illustrated
 * placeholders for now; swap in real photos once students have taken them.
 */
export function CraftMarquee() {
  const t = useTranslations("craftType");

  return (
    <div className="group relative overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]">
        {[...CRAFTS, ...CRAFTS].map((craft, index) => {
          const { icon: Icon, color } = CRAFT_META[craft];
          const duplicate = index >= CRAFTS.length;
          return (
            <li key={`${craft}-${index}`} aria-hidden={duplicate || undefined}>
              <Link
                href={`/villages?craft_type=${craft}`}
                tabIndex={duplicate ? -1 : undefined}
                className={`flex h-28 w-48 flex-col justify-between rounded-2xl border border-line p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover ${index % 2 ? "rotate-1" : "-rotate-1"}`}
                style={{
                  backgroundImage: `linear-gradient(135deg, color-mix(in oklab, ${color} 18%, white), color-mix(in oklab, ${color} 6%, white))`,
                }}
              >
                <span
                  className="grid size-10 place-items-center rounded-xl text-white"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-semibold text-ink">{t(craft)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
