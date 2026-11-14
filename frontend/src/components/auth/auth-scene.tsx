import { useTranslations } from "next-intl";
import Link from "next/link";
import type { CSSProperties } from "react";

/** A verse shown beside the form: today's folk verse from the archive, or a built-in one. */
export interface SceneVerse {
  lines: string[];
  title?: string;
  /** Archive slug; when set the title links to the full document. */
  slug?: string;
}

/** Verse cards stay short beside a form; the full text is one click away. */
const MAX_LINES = 6;

/** Conical hats float at different spots, sizes and rhythms so they never move in step. */
const HATS = [
  { className: "top-[12%] left-[8%] w-16", delay: "0s", duration: "7s" },
  { className: "top-[6%] right-[16%] w-12", delay: "-2.5s", duration: "8.5s" },
  { className: "top-[14%] left-[50%] w-10", delay: "-4s", duration: "6.5s" },
] as const;

const BAMBOO_X = [60, 78, 92, 520, 538, 552, 566];

/**
 * Decorative craft-village landscape behind the login and sign-up forms: sun, hills, a river
 * that flows, a boat that bobs, birds gliding across and conical hats drifting in the air,
 * with a folk verse revealed line by line. All motion is CSS, so it costs no JavaScript and
 * stops under prefers-reduced-motion (see globals.css).
 */
export function AuthScene({ verse }: { verse: SceneVerse }) {
  const t = useTranslations("auth.scene");
  const lines = verse.lines.slice(0, MAX_LINES);

  return (
    <div className="@container relative isolate flex h-full min-h-80 flex-col overflow-hidden rounded-card bg-[linear-gradient(180deg,#fff4e6_0%,#fde1cc_55%,#f9d3b8_100%)] p-6 sm:p-10">
      <Landscape />

      {HATS.map((hat) => (
        <ConicalHat
          key={hat.className}
          className={`absolute hidden animate-sway sm:block ${hat.className}`}
          style={{ animationDelay: hat.delay, animationDuration: hat.duration }}
        />
      ))}

      <div aria-hidden className="pointer-events-none absolute top-[8%] left-0 animate-glide">
        <Birds />
      </div>

      <figure className="relative mx-auto mt-20 mb-[46%] w-full max-w-md animate-rise sm:mt-28 rounded-card border border-white/70 bg-surface/75 p-6 shadow-card backdrop-blur-sm">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-7 left-4 font-serif text-8xl leading-none text-primary/25 select-none"
        >
          “
        </span>
        <p className="text-xs font-bold tracking-[0.18em] text-primary-strong uppercase">
          {t("eyebrow")}
        </p>
        <blockquote className="mt-3 font-serif text-[clamp(1.05rem,2vw,1.3rem)] leading-relaxed text-ink italic">
          {lines.map((line, index) => (
            <p
              key={index}
              className="animate-rise"
              style={{ animationDelay: `${300 + index * 450}ms` }}
            >
              {line}
            </p>
          ))}
        </blockquote>
        {verse.title && (
          <figcaption className="mt-4 text-sm text-ink-muted">
            {"— "}
            {verse.slug ? (
              <Link
                href={`/archive/${verse.slug}`}
                className="font-semibold text-primary hover:underline"
              >
                {verse.title}
              </Link>
            ) : (
              verse.title
            )}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

function Landscape() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] w-full"
    >
      <defs>
        <radialGradient id="auth-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--color-gold)" />
          <stop offset="0.6" stopColor="var(--color-gold)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="animate-float [animation-duration:9s]">
        <circle cx="455" cy="200" r="64" fill="url(#auth-sun)" />
        <circle cx="455" cy="200" r="28" fill="var(--color-gold)" opacity="0.9" />
      </g>

      {/* The sun rises behind the far hills. */}
      {/* Far hills, then near hills with clumps of bamboo. */}
      <path
        d="M0 250 C 90 170, 170 200, 250 215 S 420 150, 600 205 L 600 400 L 0 400 Z"
        fill="var(--color-secondary)"
        opacity="0.22"
      />
      <path
        d="M0 290 C 110 230, 230 265, 330 255 S 500 225, 600 262 L 600 400 L 0 400 Z"
        fill="var(--color-secondary)"
        opacity="0.45"
      />
      <g
        fill="none"
        stroke="var(--color-secondary)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      >
        {BAMBOO_X.map((x, index) => {
          const lean = index % 2 ? 6 : -6;
          const height = 70 + (index % 3) * 14;
          return <path key={x} d={`M${x} 292 q ${lean} -40 ${lean / 3} -${height}`} />;
        })}
      </g>

      {/* River: wave lines twice the needed width, sliding left forever. */}
      <rect x="0" y="315" width="600" height="85" fill="var(--color-indigo)" opacity="0.18" />
      <Wave y={328} opacity={0.4} duration="11s" />
      <Wave y={356} opacity={0.28} duration="7s" />

      <g className="animate-float [animation-duration:4.5s]">
        <path d="M250 330 q 45 18 95 0 l -12 14 h -71 Z" fill="var(--color-ink)" opacity="0.8" />
        <path d="M296 328 V 272 L 330 322 Z" fill="var(--color-primary)" opacity="0.85" />
        <path d="M292 328 V 284 L 266 322 Z" fill="var(--color-gold)" opacity="0.85" />
      </g>
    </svg>
  );
}

function Wave({ y, opacity, duration }: { y: number; opacity: number; duration: string }) {
  const crests = Array.from({ length: 8 }, () => "q 37.5 -10 75 0 t 75 0").join(" ");
  return (
    <g className="animate-wave [transform-box:fill-box]" style={{ animationDuration: duration }}>
      <path
        d={`M0 ${y} ${crests}`}
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity={opacity}
      />
    </g>
  );
}

function Birds() {
  return (
    <svg
      viewBox="0 0 90 30"
      className="w-24"
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.45"
    >
      <path d="M2 12 q 6 -7 12 0 q 6 -7 12 0" />
      <path d="M36 4 q 5 -5 10 0 q 5 -5 10 0" />
      <path d="M58 20 q 6 -7 12 0 q 6 -7 12 0" />
    </svg>
  );
}

function ConicalHat({ className, style }: { className: string; style: CSSProperties }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 30"
      className={`pointer-events-none ${className}`}
      style={style}
    >
      <path
        d="M32 2 L 62 24 Q 32 32 2 24 Z"
        fill="var(--color-gold-soft)"
        stroke="var(--color-gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <g stroke="var(--color-gold)" strokeWidth="0.8" opacity="0.7">
        <path d="M32 2 L 14 25" />
        <path d="M32 2 L 32 27" />
        <path d="M32 2 L 50 25" />
      </g>
      <path
        d="M8 22 Q 32 30 56 22"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        opacity="0.6"
      />
    </svg>
  );
}
