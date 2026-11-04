"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface HorizontalScrollerProps {
  /** Accessible name of the scrolling region, e.g. the section title. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** `<li>` items; give each a width such as `w-72 shrink-0`. */
  children: ReactNode;
}

/**
 * A row of cards that scrolls sideways with snap points. Touch and trackpad scroll natively;
 * the arrow buttons (desktop) move by about one screen and hide at either end.
 */
export function HorizontalScroller({
  label,
  previousLabel,
  nextLabel,
  children,
}: HorizontalScrollerProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const updateEdges = useCallback(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    // 1px tolerance: scroll positions are fractional on zoomed or high-DPI screens.
    setEdges({
      atStart: list.scrollLeft <= 1,
      atEnd: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const list = listRef.current;
    if (!list) {
      return;
    }
    const observer = new ResizeObserver(updateEdges);
    observer.observe(list);
    return () => observer.disconnect();
  }, [updateEdges]);

  const scrollByPage = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({
      left: direction * list.clientWidth * 0.85,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const arrowClass =
    "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink shadow-card transition hover:border-primary/40 sm:grid";

  return (
    <div className="relative">
      <ul
        ref={listRef}
        onScroll={updateEdges}
        aria-label={label}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-4 focus-visible:outline-2 focus-visible:outline-primary [scrollbar-width:thin] [&>li]:snap-start"
      >
        {children}
      </ul>
      {!edges.atStart && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label={previousLabel}
          className={`${arrowClass} -left-5`}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {!edges.atEnd && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label={nextLabel}
          className={`${arrowClass} -right-5`}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
