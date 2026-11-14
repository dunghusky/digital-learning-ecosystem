import {
  CookingPot,
  Fan,
  Fish,
  Flame,
  Grid3x3,
  Hammer,
  Leaf,
  type LucideIcon,
  Shapes,
  Soup,
  Sparkles,
  Triangle,
  Wine,
} from "lucide-react";

import type { CraftType, FormerRegion } from "@/lib/api/villages";

export interface CraftMeta {
  icon: LucideIcon;
  /** Hex rather than a Tailwind class: map markers and inline styles need a raw color. */
  color: string;
}

/**
 * Single source of truth for how each craft looks. Cards, filter chips, map markers and the
 * map legend all read from here so a craft keeps the same color and icon across the site.
 * `Record<CraftType, …>` makes the compiler flag any craft type added without a style.
 */
export const CRAFT_META: Record<CraftType, CraftMeta> = {
  conical_hat: { icon: Triangle, color: "#d97706" },
  fish_sauce: { icon: Fish, color: "#0284c7" },
  mat_weaving: { icon: Grid3x3, color: "#65a30d" },
  bamboo_rattan: { icon: Leaf, color: "#059669" },
  woodwork: { icon: Hammer, color: "#92400e" },
  rice_wine: { icon: Wine, color: "#7c3aed" },
  noodles_cakes: { icon: Soup, color: "#ea580c" },
  metalwork: { icon: Flame, color: "#475569" },
  paper_fan: { icon: Fan, color: "#db2777" },
  broom: { icon: Sparkles, color: "#0d9488" },
  food_specialty: { icon: CookingPot, color: "#dc2626" },
  other: { icon: Shapes, color: "#78716c" },
};

/** Display order for filters and legends: the declaration order of CRAFT_META. */
export const CRAFT_TYPES = Object.keys(CRAFT_META) as CraftType[];

export const REGIONS: readonly FormerRegion[] = ["quang_tri", "quang_binh"];
