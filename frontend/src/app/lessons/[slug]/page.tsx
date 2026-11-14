import {
  ArrowLeft,
  ArrowUpRight,
  CircleCheckBig,
  Flag,
  MapPin,
  PackageCheck,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GenreLabel } from "@/components/archive/document-parts";
import { Reader } from "@/components/archive/reader";
import { SubjectBadge } from "@/components/lessons/lesson-parts";
import { LessonWorkspace } from "@/components/lessons/lesson-workspace";
import { RelatedQuizzes } from "@/components/quizzes/related-quizzes";
import { CRAFT_META } from "@/lib/craft-meta";
import { fetchLesson, type LessonReading } from "@/lib/api/lessons";
import { SUBJECT_META } from "@/lib/lesson-meta";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await fetchLesson(slug);
  if (!lesson) {
    return {};
  }
  const description = lesson.objectives.join(" ") || lesson.introduction;
  return {
    title: lesson.title,
    description,
    alternates: { canonical: `/lessons/${slug}` },
    openGraph: { type: "article", title: lesson.title, description, url: `/lessons/${slug}` },
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [t, lesson] = await Promise.all([getTranslations("lessons"), fetchLesson(slug)]);

  if (!lesson) {
    notFound();
  }
  // Primary-school readers start with larger text, as in the archive.
  const gradeLevel = SUBJECT_META.vietnamese.grades.includes(lesson.grade)
    ? "primary"
    : "secondary";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/lessons"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>

      <header className="mt-6">
        <SubjectBadge subject={lesson.subject} grade={lesson.grade} />
        <h1 className="mt-3 text-[clamp(2rem,5vw,2.75rem)] leading-tight font-extrabold tracking-tight text-ink">
          {lesson.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
          {lesson.author_name && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" aria-hidden />
              {t("author", { name: lesson.author_name })}
            </span>
          )}
          {lesson.villages.map((village) => (
            <Link
              key={village.code}
              href={`/villages/${village.code}`}
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              <MapPin
                className="size-4"
                style={{ color: CRAFT_META[village.craft_type].color }}
                aria-hidden
              />
              {village.name}
            </Link>
          ))}
        </div>
      </header>

      {lesson.objectives.length > 0 && (
        <section className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <Flag className="size-5 text-primary" aria-hidden />
            {t("objectives")}
          </h2>
          <ul className="mt-3 space-y-2">
            {lesson.objectives.map((objective) => (
              <li key={objective} className="flex gap-2 leading-relaxed text-ink/90">
                <CircleCheckBig className="mt-1 size-4 shrink-0 text-secondary" aria-hidden />
                {objective}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.introduction && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-ink">{t("introduction")}</h2>
          <p className="mt-3 leading-relaxed whitespace-pre-line text-ink/90">
            {lesson.introduction}
          </p>
        </section>
      )}

      {lesson.readings.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-ink">{t("readings")}</h2>
          <div className="mt-5 space-y-12">
            {lesson.readings.map((reading, index) => (
              <ReadingBlock
                key={reading.document.slug}
                reading={reading}
                number={index + 1}
                gradeLevel={gradeLevel}
                t={t}
              />
            ))}
          </div>
        </section>
      )}

      {lesson.tasks.length > 0 && (
        <section className="mt-14" aria-labelledby="lesson-tasks">
          <h2 id="lesson-tasks" className="text-xl font-bold text-ink">
            {t("tasks")}
          </h2>
          {lesson.expected_output && (
            <p className="mt-3 flex gap-2 rounded-card bg-indigo-soft px-4 py-3 text-sm leading-relaxed text-ink">
              <PackageCheck className="mt-0.5 size-4 shrink-0 text-indigo" aria-hidden />
              <span>
                <strong>{t("expectedOutput")}:</strong> {lesson.expected_output}
              </span>
            </p>
          )}
          <div className="mt-6">
            <LessonWorkspace slug={lesson.slug} tasks={lesson.tasks} />
          </div>
        </section>
      )}

      <RelatedQuizzes quizzes={lesson.quizzes} title={t("quizzes")} />
    </main>
  );
}

function ReadingBlock({
  reading,
  number,
  gradeLevel,
  t,
}: {
  reading: LessonReading;
  number: number;
  gradeLevel: "primary" | "secondary";
  t: Awaited<ReturnType<typeof getTranslations<"lessons">>>;
}) {
  const { document } = reading;
  const credit = [document.author, document.source].filter((part) => part.trim()).join(" · ");

  return (
    <article>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-bold text-ink-muted">{t("readingNumber", { number })}</span>
        <GenreLabel document={document} />
      </div>
      <h3 className="mt-2 text-2xl font-bold text-ink">
        <Link
          href={`/archive/${document.slug}`}
          className="inline-flex items-center gap-1 hover:text-primary"
        >
          {document.title}
          <ArrowUpRight className="size-5 opacity-60" aria-hidden />
        </Link>
      </h3>
      {reading.note && (
        <p className="mt-2 rounded-xl bg-gold-soft px-3 py-2 text-sm text-ink">{reading.note}</p>
      )}
      <div className="mt-4">
        <Reader document={{ ...document, grade_level: gradeLevel }} />
      </div>
      {credit && <p className="mt-3 text-right text-sm text-ink-muted italic">{credit}</p>}
    </article>
  );
}
