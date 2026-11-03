import {
  BookOpen,
  Feather,
  Lightbulb,
  type LucideIcon,
  Mic,
  Music,
  Newspaper,
  PenLine,
  Quote,
  Scroll,
  Sparkles,
  Baby,
  Waves,
} from "lucide-react";

import type { Genre, GradeLevel } from "@/lib/api/documents";

/** How a document card lays out its content; see the archive cards. */
export type GenreLayout = "verse" | "riddle" | "story";

export interface GenreMeta {
  icon: LucideIcon;
  /** Hex rather than a Tailwind class, matching CRAFT_META. */
  color: string;
  layout: GenreLayout;
}

/**
 * Single source of truth for how each genre looks in tabs, cards and the reader.
 * `Record<Genre, …>` makes the compiler flag any genre added without a style.
 * Declaration order is the display order: folk genres first, then modern writing.
 */
export const GENRE_META: Record<Genre, GenreMeta> = {
  folk_verse: { icon: Feather, color: "#e2582b", layout: "verse" },
  proverb: { icon: Quote, color: "#b45309", layout: "verse" },
  work_song: { icon: Waves, color: "#0284c7", layout: "verse" },
  narrative_verse: { icon: Music, color: "#7c3aed", layout: "verse" },
  nursery_rhyme: { icon: Baby, color: "#db2777", layout: "verse" },
  riddle: { icon: Lightbulb, color: "#d9a441", layout: "riddle" },
  legend: { icon: Scroll, color: "#2e4a7d", layout: "story" },
  folk_tale: { icon: BookOpen, color: "#2f6b4f", layout: "story" },
  poem: { icon: PenLine, color: "#9333ea", layout: "verse" },
  essay: { icon: Sparkles, color: "#0d9488", layout: "story" },
  reportage: { icon: Newspaper, color: "#475569", layout: "story" },
  interview: { icon: Mic, color: "#92400e", layout: "story" },
};

export const GENRES = Object.keys(GENRE_META) as Genre[];

/** "all" is not offered as a filter: those documents show under either grade. */
export const GRADE_FILTERS: readonly GradeLevel[] = ["primary", "secondary"];
