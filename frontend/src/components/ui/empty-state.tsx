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
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span
        className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary"
        aria-hidden
      >
        <Icon className="size-7" />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
