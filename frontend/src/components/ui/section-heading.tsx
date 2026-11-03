import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  /** Optional secondary action shown on the right on wide screens, e.g. "see all". */
  action?: ReactNode;
  /** Use "h1" when the heading opens a page rather than a section. */
  as?: "h1" | "h2";
}

/** Short accent dash + small label, then a large heading: the standard section opener. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  action,
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-3 text-sm font-medium text-ink-muted">
          <span className="h-0.5 w-6 rounded-full bg-primary" aria-hidden />
          {eyebrow}
        </p>
        <Heading className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold tracking-tight text-ink">
          {title}
        </Heading>
        {lead && <p className="mt-2 max-w-2xl text-ink-muted">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
