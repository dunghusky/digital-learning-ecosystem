import { NotebookPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LessonCard } from "@/components/lessons/lesson-card";
import { LESSONS_PATH, LessonFilters } from "@/components/lessons/lesson-filters";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { fetchLessons, type LessonQuery } from "@/lib/api/lessons";
import { buildHref } from "@/lib/url";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lessons");
  return {
    title: t("title"),
    description: t("lead"),
    openGraph: { title: t("title"), description: t("lead"), url: LESSONS_PATH },
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LessonsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("lessons");
  const params = await searchParams;
  const page = Number(first(params.page) ?? 1);
  const query: LessonQuery = {
    subject: first(params.subject),
    grade: first(params.grade),
    village: first(params.village),
    document: first(params.document),
    search: first(params.search),
  };
  const lessons = await fetchLessons({ ...query, page: page > 1 ? page : undefined });
  const linkClass = buttonClass("outline", "text-sm");

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading as="h1" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      <div className="mt-8">
        <LessonFilters query={query} />
      </div>

      <p className="mt-6 text-sm text-ink-muted" aria-live="polite">
        {t("count", { count: lessons.count })}
      </p>

      {lessons.results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={NotebookPen}
            title={t("empty")}
            hint={t("emptyHint")}
            action={
              <Link href={LESSONS_PATH} className={linkClass}>
                {t("reset")}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.results.map((lesson, index) => (
            <Reveal as="li" key={lesson.slug} delay={(index % 3) * 70}>
              <LessonCard lesson={lesson} />
            </Reveal>
          ))}
        </ul>
      )}

      {(lessons.previous || lessons.next) && (
        <nav className="mt-8 flex justify-between">
          {lessons.previous ? (
            <Link
              href={buildHref(LESSONS_PATH, { ...query, page: page - 1 })}
              className={linkClass}
            >
              {t("previous")}
            </Link>
          ) : (
            <span />
          )}
          {lessons.next && (
            <Link
              href={buildHref(LESSONS_PATH, { ...query, page: page + 1 })}
              className={linkClass}
            >
              {t("next")}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
