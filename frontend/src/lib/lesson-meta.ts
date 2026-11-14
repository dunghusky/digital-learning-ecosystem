import { BookOpenText, Compass, type LucideIcon, Palette, PenLine } from "lucide-react";

import type { Subject, TaskKind } from "@/lib/api/lessons";

export interface SubjectMeta {
  /** Hex rather than a Tailwind class, matching CRAFT_META and GENRE_META. */
  color: string;
  /** The grades that study this subject. */
  grades: readonly number[];
}

/** Primary school (1-5) studies Vietnamese, lower secondary (6-9) literature, as in the backend. */
export const SUBJECT_META: Record<Subject, SubjectMeta> = {
  vietnamese: { color: "#2f6b4f", grades: [1, 2, 3, 4, 5] },
  literature: { color: "#7c3aed", grades: [6, 7, 8, 9] },
};

export const SUBJECTS = Object.keys(SUBJECT_META) as Subject[];

export const TASK_KIND_META: Record<TaskKind, { icon: LucideIcon; color: string }> = {
  reading: { icon: BookOpenText, color: "#0284c7" },
  writing: { icon: PenLine, color: "#e2582b" },
  creative: { icon: Palette, color: "#db2777" },
  fieldwork: { icon: Compass, color: "#2f6b4f" },
};
