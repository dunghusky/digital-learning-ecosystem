"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef } from "react";

import { HERO_PHOTOS } from "@/components/home/hero-photos";

/** Optional looping clip behind the hero, e.g. students filming a craft. Null = none yet. */
const HERO_VIDEO: { src: string; poster: string } | null = null;

/**
 * Decorative layer behind the hero: warm glows, polaroid-style photos of Quang Tri that bob
 * gently and drift with the pointer (parallax), and an optional video. Pointer position is
 * written to CSS variables so moving the mouse never re-renders React.
 */
export function HeroBackdrop() {
  const t = useTranslations("home.photos");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!element || !finePointer || reducedMotion) {
      return;
    }
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--mx", String(event.clientX / window.innerWidth - 0.5));
        element.style.setProperty("--my", String(event.clientY / window.innerHeight - 0.5));
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {HERO_VIDEO && (
        <>
          <video
            className="absolute inset-0 size-full object-cover motion-reduce:hidden"
            src={HERO_VIDEO.src}
            poster={HERO_VIDEO.poster}
            autoPlay
            muted
            loop
            playsInline
          />
          {/* Cream veil keeps the headline readable and the page on-palette. */}
          <div className="absolute inset-0 bg-bg/85" />
        </>
      )}

      <div className="absolute -top-1/3 left-1/2 h-[42rem] w-[60rem] -translate-x-1/2 animate-drift rounded-full bg-[radial-gradient(closest-side,#fde1cc,transparent)] opacity-90 blur-2xl" />
      <div className="absolute top-1/3 -left-40 h-80 w-80 animate-drift rounded-full bg-gold-soft blur-3xl" />
      <div className="absolute -right-32 bottom-0 h-72 w-72 animate-drift rounded-full bg-indigo-soft blur-3xl [animation-delay:-8s]" />

      {HERO_PHOTOS.map((photo, index) => (
        <div
          key={photo.key}
          className={`absolute hidden transition-transform duration-700 ease-out xl:block ${photo.className}`}
          style={{
            transform: `translate3d(calc(var(--mx, 0) * ${photo.depth}px), calc(var(--my, 0) * ${photo.depth}px), 0) rotate(${photo.rotate}deg)`,
          }}
        >
          {/* Entrance pop-in, then an endless gentle bob, offset per photo. */}
          <div className="animate-pop" style={{ animationDelay: `${400 + index * 120}ms` }}>
            <figure
              className="animate-float rounded-xl bg-surface p-2 pb-1 shadow-card-hover"
              style={{ animationDelay: `${-index * 1.1}s` }}
            >
              <Image
                src={photo.src}
                alt=""
                width={photo.width}
                height={photo.height}
                sizes="224px"
                preload={index < 2}
                className="h-auto w-full rounded-lg"
              />
              <figcaption className="px-1 py-1.5 text-center text-xs font-semibold text-ink-muted">
                {t(photo.key)}
              </figcaption>
            </figure>
          </div>
        </div>
      ))}
    </div>
  );
}
