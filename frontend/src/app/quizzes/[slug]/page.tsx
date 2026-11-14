import { ArrowLeft, BookOpen, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { QuizPlayer } from "@/components/quizzes/quiz-player";
import { fetchQuiz } from "@/lib/api/quizzes";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const quiz = await fetchQuiz(slug);
  if (!quiz) {
    return {};
  }
  return {
    title: quiz.title,
    description: quiz.description,
    alternates: { canonical: `/quizzes/${slug}` },
    openGraph: { title: quiz.title, description: quiz.description, url: `/quizzes/${slug}` },
  };
}

export default async function QuizPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [t, tGrade, quiz] = await Promise.all([
    getTranslations("quizzes"),
    getTranslations("gradeLevel"),
    fetchQuiz(slug),
  ]);

  if (!quiz) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/quizzes"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>

      <header className="mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
          <Sparkles className="size-4" aria-hidden />
          {tGrade(quiz.grade_level)}
        </span>
        <h1 className="mt-3 text-[clamp(2rem,5vw,2.75rem)] leading-tight font-extrabold tracking-tight text-ink">
          {quiz.title}
        </h1>
        {quiz.description && <p className="mt-3 text-lg text-ink-muted">{quiz.description}</p>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
          {quiz.lesson && (
            <Link
              href={`/lessons/${quiz.lesson.slug}`}
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              <BookOpen className="size-4" aria-hidden />
              {t("fromLesson", { title: quiz.lesson.title })}
            </Link>
          )}
          {quiz.villages.map((village) => (
            <Link
              key={village.code}
              href={`/villages/${village.code}`}
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              <MapPin className="size-4" aria-hidden />
              {village.name}
            </Link>
          ))}
        </div>
      </header>

      <div className="mt-8">
        {quiz.questions.length > 0 ? (
          <QuizPlayer quiz={quiz} />
        ) : (
          <p className="text-ink-muted">{t("questionCount", { count: 0 })}</p>
        )}
      </div>
    </main>
  );
}
