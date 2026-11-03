"use client";

import { ArrowRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const TYPE_MS = 55;
const HOLD_MS = 1800;

/**
 * Big search box whose placeholder types out example queries in a loop. It is a plain GET form
 * to /villages, so it works before hydration and the animation is purely decorative.
 */
export function HeroSearch() {
  const t = useTranslations("home");
  // Frozen in state so the effect below does not restart on every re-render.
  const [examples] = useState(() => t.raw("searchExamples") as string[]);
  const [placeholder, setPlaceholder] = useState(examples[0]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let example = 0;
    let length = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const text = examples[example];
      length += 1;
      setPlaceholder(text.slice(0, length));
      if (length < text.length) {
        timer = setTimeout(tick, TYPE_MS);
      } else {
        example = (example + 1) % examples.length;
        length = 0;
        timer = setTimeout(tick, HOLD_MS);
      }
    };
    timer = setTimeout(tick, HOLD_MS);
    return () => clearTimeout(timer);
  }, [examples]);

  return (
    <form
      action="/villages"
      method="get"
      role="search"
      className="flex items-center gap-2 rounded-[1.25rem] border border-line bg-surface p-2 shadow-card transition focus-within:border-primary/60 focus-within:shadow-card-hover"
    >
      <label className="flex flex-1 items-center gap-3 pl-3">
        <span className="sr-only">{t("searchLabel")}</span>
        <Search className="size-5 shrink-0 text-ink-muted" aria-hidden />
        <input
          type="search"
          name="search"
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent py-3 text-base text-ink placeholder:text-ink-muted/80 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="group bg-cta inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 font-semibold text-white"
      >
        <span className="hidden sm:inline">{t("searchSubmit")}</span>
        <ArrowRight className="size-5 transition group-hover:translate-x-0.5" aria-hidden />
      </button>
    </form>
  );
}
