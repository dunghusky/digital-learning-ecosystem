import { useTranslations } from "next-intl";

import type { CraftType } from "@/lib/api/villages";
import { CRAFT_META } from "@/lib/craft-meta";

/** Colored icon + craft name, e.g. on village cards and detail headers. */
export function CraftBadge({ craftType }: { craftType: CraftType }) {
  const t = useTranslations("craftType");
  const { icon: Icon, color } = CRAFT_META[craftType];

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
      <span
        className="grid size-6 place-items-center rounded-full text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        <Icon className="size-3.5" strokeWidth={2.5} />
      </span>
      {t(craftType)}
    </span>
  );
}
