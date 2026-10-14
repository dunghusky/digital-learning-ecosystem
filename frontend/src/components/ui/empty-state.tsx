import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  /** Optional call to action, e.g. a "clear filters" link. */
  action?: ReactNode;
}

/** Friendly placeholder for empty results, so a blank page never looks broken. */
export function EmptyState({ icon: Icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <span
        className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"
        aria-hidden
      >
        <Icon className="size-7" />
      </span>
      <p className="mt-4 font-semibold text-stone-800">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-stone-600">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
