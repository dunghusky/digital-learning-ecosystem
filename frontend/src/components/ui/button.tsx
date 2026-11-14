import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-cta text-white shadow-[0_8px_20px_-8px_rgb(226_88_43/0.6)] hover:shadow-[0_12px_28px_-8px_rgb(226_88_43/0.7)]",
  outline: "border border-line bg-surface text-ink hover:border-primary hover:text-primary",
};

export function buttonClass(variant: Variant = "primary", extra = ""): string {
  return [
    "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    VARIANTS[variant],
    extra,
  ].join(" ");
}

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

/** Pill-shaped link styled as a button; use `buttonClass` for real <button> elements. */
export function ButtonLink({ href, children, variant = "primary", className }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
