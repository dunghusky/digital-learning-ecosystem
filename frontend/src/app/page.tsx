import { ArrowUpRight, BookOpen, Compass, Map, Puzzle, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CraftMarquee } from "@/components/home/craft-marquee";
import { DailyVerse } from "@/components/home/daily-verse";
import { ExploreTiles } from "@/components/home/explore-tiles";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { HeroSearch } from "@/components/home/hero-search";
import { PhotoCredits } from "@/components/home/photo-credits";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { VillageCard } from "@/components/village-card";
import { fetchFeaturedDocument, fetchGenreCounts } from "@/lib/api/documents";
import { fetchVillages } from "@/lib/api/villages";
import type { CraftType } from "@/lib/api/villages";
import { CRAFT_META } from "@/lib/craft-meta";

const FEATURED_COUNT = 3;
const SUGGESTED_CRAFTS: CraftType[] = ["conical_hat", "fish_sauce", "bamboo_rattan"];

/** Each feature card gets one pastel pair from the palette (soft background + strong accent). */
const FEATURES: {
  key: string;
  icon: LucideIcon;
  tint: string;
  accent: string;
  href?: string;
}[] = [
  {
    key: "map",
    icon: Map,
    tint: "bg-primary-soft",
    accent: "bg-primary",
    href: "/map",
  },
  {
    key: "archive",
    icon: BookOpen,
    tint: "bg-indigo-soft",
    accent: "bg-indigo",
    href: "/archive",
  },
  {
    key: "lessons",
    icon: Compass,
    tint: "bg-secondary-soft",
    accent: "bg-secondary",
  },
  { key: "quiz", icon: Puzzle, tint: "bg-gold-soft", accent: "bg-gold" },
];

const STEPS = ["explore", "learn", "share"] as const;

/**
 * Rendered per request instead of at build time: the build machine (CI, Vercel) cannot reach
 * the API, and village content should not be frozen into the deployed bundle anyway. The
 * underlying fetch is still cached, so the backend is hit at most once per revalidate window.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations();
  const [villages, dailyVerse, genreCounts] = await Promise.all([
    fetchVillages({ page_size: FEATURED_COUNT }),
    // The home page must not fail because of the archive: without it, the tiles stand alone.
    fetchFeaturedDocument("folk_verse").catch(() => null),
    fetchGenreCounts().catch(() => []),
  ]);
  const documentCount = genreCounts.reduce((total, genre) => total + genre.count, 0);

  return (
    <main>
      <Hero t={t} />
      <CraftMarquee />
      <PhotoCredits />

      <section className="mx-auto max-w-6xl px-4 pt-20">
        <Reveal>
          <SectionHeading
            eyebrow={t("home.daily.sectionEyebrow")}
            title={t("home.daily.sectionTitle")}
          />
        </Reveal>
        <div className={`mt-10 grid gap-5 ${dailyVerse ? "lg:grid-cols-[3fr_2fr]" : ""}`}>
          {dailyVerse && (
            <Reveal className="h-full">
              <DailyVerse document={dailyVerse} />
            </Reveal>
          )}
          <Reveal delay={80} className="h-full">
            <ExploreTiles stats={{ villages: villages.count, documents: documentCount }} />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <SectionHeading
            eyebrow={t("home.featuredEyebrow")}
            title={t("home.featuredTitle")}
            lead={t("home.featuredLead")}
            action={
              <ButtonLink href="/villages" variant="outline">
                {t("home.seeAll")}
              </ButtonLink>
            }
          />
        </Reveal>
        {villages.results.length === 0 ? (
          <p className="mt-8 text-ink-muted">{t("home.featuredEmpty")}</p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {villages.results.map((village, index) => (
              <Reveal as="li" key={village.code} delay={index * 80}>
                <VillageCard village={village} />
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      <section className="border-y border-line bg-surface-muted">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <SectionHeading
              eyebrow={t("home.featuresEyebrow")}
              title={
                <>
                  {t("home.featuresTitle1")}
                  <br />
                  {t("home.featuresTitle2")}
                </>
              }
            />
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <Reveal as="li" key={feature.key} delay={index * 70}>
                <FeatureCard
                  {...feature}
                  title={t(`home.features.${feature.key}.title`)}
                  text={t(`home.features.${feature.key}.text`)}
                  soon={feature.href ? undefined : t("home.soon")}
                />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <SectionHeading eyebrow={t("home.stepsEyebrow")} title={t("home.stepsTitle")} />
        </Reveal>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step} delay={index * 80} className="relative">
              <span className="text-6xl font-extrabold text-primary/15">0{index + 1}</span>
              <h3 className="-mt-6 text-xl font-bold text-ink">{t(`home.steps.${step}.title`)}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{t(`home.steps.${step}.text`)}</p>
            </Reveal>
          ))}
        </ol>
      </section>
    </main>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations>>;

function Hero({ t }: { t: Translate }) {
  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 pb-20 text-center sm:pt-24">
        <p className="inline-flex animate-rise items-center gap-2 rounded-full border border-primary/30 bg-surface/70 px-4 py-1.5 text-sm font-medium text-primary-strong">
          <Sparkles className="size-4" aria-hidden />
          {t("home.badge")}
        </p>

        <h1 className="mt-6 animate-rise text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-ink [animation-delay:80ms]">
          {t("home.heroTitle1")}
          <br />
          <span className="relative inline-block text-primary">
            {t("home.heroHighlight")}
            <svg
              aria-hidden
              viewBox="0 0 300 20"
              preserveAspectRatio="none"
              className="absolute -bottom-5 left-0 h-3 w-full"
            >
              <defs>
                <linearGradient id="hero-underline" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--color-gold)" />
                  <stop offset="1" stopColor="var(--color-primary)" />
                </linearGradient>
              </defs>
              <path
                d="M4 14 C 80 4, 200 4, 296 10"
                fill="none"
                stroke="url(#hero-underline)"
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                className="animate-draw"
              />
            </svg>
          </span>
        </h1>

        <p className="mt-6 max-w-2xl animate-rise text-lg leading-relaxed text-ink-muted [animation-delay:160ms]">
          {t("home.heroLead")}
        </p>

        <div className="mt-10 w-full max-w-2xl animate-rise [animation-delay:240ms]">
          <HeroSearch />
          <p className="mt-3 text-sm text-ink-muted">{t("home.searchNote")}</p>
        </div>

        <div className="mt-6 flex animate-rise flex-wrap items-center justify-center gap-2 [animation-delay:320ms]">
          <span className="text-sm text-ink-muted">{t("home.tryAsking")}</span>
          {SUGGESTED_CRAFTS.map((craft) => {
            const { icon: Icon, color } = CRAFT_META[craft];
            return (
              <Link
                key={craft}
                href={`/villages?craft_type=${craft}`}
                className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/25 bg-surface/80 px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card"
              >
                <Icon className="size-4" style={{ color }} aria-hidden />
                {t(`craftType.${craft}`)}
                <ArrowUpRight
                  className="size-3.5 text-ink-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  tint: string;
  accent: string;
  title: string;
  text: string;
  href?: string;
  soon?: string;
}

/** Pastel illustration (icon tile + a tilted "paper" mock-up) above a title and short text. */
function FeatureCard({ icon: Icon, tint, accent, title, text, href, soon }: FeatureCardProps) {
  const body = (
    <>
      <div
        className={`relative flex h-40 items-center justify-center gap-4 overflow-hidden rounded-2xl ${tint}`}
      >
        <span
          className={`grid size-14 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:scale-105 ${accent}`}
          aria-hidden
        >
          <Icon className="size-7" />
        </span>
        <span
          aria-hidden
          className="w-28 rotate-3 space-y-2 rounded-xl bg-surface p-3 shadow-card transition duration-300 group-hover:rotate-6"
        >
          <span className={`block h-1.5 w-16 rounded-full opacity-70 ${accent}`} />
          <span className={`block h-1.5 w-20 rounded-full opacity-40 ${accent}`} />
          <span className={`block h-1.5 w-12 rounded-full opacity-25 ${accent}`} />
        </span>
        {soon && (
          <span className="absolute top-3 right-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink-muted">
            {soon}
          </span>
        )}
      </div>
      <h3 className="mt-5 px-2 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 px-2 pb-3 text-sm leading-relaxed text-ink-muted">{text}</p>
    </>
  );
  const className =
    "group block h-full rounded-card border border-line bg-surface p-3 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover";

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
