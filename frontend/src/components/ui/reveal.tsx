"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type RevealState = "idle" | "pending" | "done";

interface RevealProps {
  children: ReactNode;
  /** Stagger for items in a grid, in milliseconds. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}

/**
 * Fades its content in the first time it scrolls into view. Server HTML renders fully visible
 * ("idle"), so the page still works without JavaScript and crawlers see everything.
 */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<RevealState>("idle");

  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) {
      return;
    }
    setState("pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("done");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const stateClass = state === "idle" ? "" : `reveal-${state}`;
  return (
    <Tag
      ref={ref as never}
      className={`${stateClass} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
