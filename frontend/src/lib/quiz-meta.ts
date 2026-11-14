import { CircleHelp, Image, type LucideIcon, ListChecks, Shuffle, TextCursorInput } from "lucide-react";

import type { QuestionKind } from "@/lib/api/quizzes";

/** Icon and colour per question kind; hex, matching CRAFT_META and TASK_KIND_META. */
export const QUESTION_KIND_META: Record<QuestionKind, { icon: LucideIcon; color: string }> = {
  single_choice: { icon: ListChecks, color: "#0284c7" },
  image_choice: { icon: Image, color: "#db2777" },
  fill_blank: { icon: TextCursorInput, color: "#e2582b" },
  riddle: { icon: CircleHelp, color: "#7c3aed" },
  matching: { icon: Shuffle, color: "#2f6b4f" },
};

/** Fill-in-the-blank prompts mark the missing word with this, as the backend does. */
export const BLANK = "___";

/** A short cheer for the result screen, picked by how much of the quiz was right. */
export function resultTier(score: number, maxScore: number): "great" | "good" | "tryAgain" {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.8) return "great";
  if (ratio >= 0.5) return "good";
  return "tryAgain";
}
