import { Sparkles, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { QuizCard } from "@/components/quizzes/quiz-card";
import { buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { GradeLevel } from "@/lib/api/documents";
import { fetchQuizzes, type QuizQuery } from "@/lib/api/quizzes";
import { buildHref } from "@/lib/url";

const QUIZZES_PATH = "/quizzes";
const GRADE_LEVELS: GradeLevel[] = ["primary", "secondary"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("quizzes");
  return {
    title: t("title"),
    description: t("lead"),
    openGraph: { title: t("title"), description: t("lead"), url: QUIZZES_PATH },
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuizzesPage({ searchParams }: { searchParams: SearchParams }) {
  const [t, tGrade] = await Promise.all([getTranslations("quizzes"), getTranslations("gradeLevel")]);
  const params = await searchParams;
  const page = Number(first(params.page) ?? 1);
  const query: QuizQuery = {
    grade_level: first(params.grade_level),
    village: first(params.village),
    lesson: first(params.lesson),
    search: first(params.search),
  };
  const quizzes = await fetchQuizzes({ ...query, page: page > 1 ? page : undefined });
  const hrefWith = (changes: Partial<QuizQuery>) =>
    buildHref(QUIZZES_PATH, { ...query, ...changes, page: undefined });
  const hasFilters = Object.values(query).some(Boolean);
  const linkClass = buttonClass("outline", "text-sm");

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading as="h1" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      <nav aria-label={t("gradeLabel")} className="mt-8 flex flex-wrap items-center gap-2">
        <Chip href={hrefWith({ grade_level: undefined })} active={!query.grade_level}>
          {t("allGrades")}
        </Chip>
        {GRADE_LEVELS.map((level) => (
          <Chip
            key={level}
            href={hrefWith({ grade_level: level })}
            active={query.grade_level === level}
            color="#2f6b4f"
          >
            {tGrade(level)}
          </Chip>
        ))}
        {hasFilters && (
          <Link
            href={QUIZZES_PATH}
            className="ml-auto inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
          >
            <X className="size-4" aria-hidden />
            {t("reset")}
          </Link>
        )}
      </nav>

      <p className="mt-6 text-sm text-ink-muted" aria-live="polite">
        {t("count", { count: quizzes.count })}
      </p>

      {quizzes.results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Sparkles}
            title={t("empty")}
            hint={t("emptyHint")}
            action={
              <Link href={QUIZZES_PATH} className={linkClass}>
                {t("reset")}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.results.map((quiz, index) => (
            <Reveal as="li" key={quiz.slug} delay={(index % 3) * 70}>
              <QuizCard quiz={quiz} />
            </Reveal>
          ))}
        </ul>
      )}

      {(quizzes.previous || quizzes.next) && (
        <nav className="mt-8 flex justify-between">
          {quizzes.previous ? (
            <Link href={buildHref(QUIZZES_PATH, { ...query, page: page - 1 })} className={linkClass}>
              {t("previous")}
            </Link>
          ) : (
            <span />
          )}
          {quizzes.next && (
            <Link href={buildHref(QUIZZES_PATH, { ...query, page: page + 1 })} className={linkClass}>
              {t("next")}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
