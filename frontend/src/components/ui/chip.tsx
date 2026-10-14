import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  icon?: LucideIcon;
  /** Accent color (hex) used for the icon and the active state; defaults to the brand green. */
  color?: string;
  /** Renders a link when set (server-side filters), otherwise a button (client-side filters). */
  href?: string;
  onClick?: () => void;
}

const DEFAULT_COLOR = "#047857"; // emerald-700

/** Rounded, toggleable filter pill. */
export function Chip({
  children,
  active = false,
  icon: Icon,
  color = DEFAULT_COLOR,
  href,
  onClick,
}: ChipProps) {
  const className = [
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
    "transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2",
    active ? "text-white shadow-sm" : "border-stone-300 bg-white text-stone-700",
  ].join(" ");
  const style = active ? { backgroundColor: color, borderColor: color } : undefined;
  const content = (
    <>
      {Icon && <Icon className="size-4" style={active ? undefined : { color }} aria-hidden />}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        style={style}
        aria-current={active ? "true" : undefined}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={style}
      aria-pressed={active}
    >
      {content}
    </button>
  );
}
