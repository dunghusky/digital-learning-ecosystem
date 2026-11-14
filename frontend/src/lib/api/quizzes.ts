import { authSend, readSession } from "@/lib/auth/session";

import { ApiError, apiFetch, apiSend, type Paginated } from "./client";
import type { GradeLevel, VillageRef } from "./documents";
import type { LessonRef } from "./lessons";

export type QuestionKind = "single_choice" | "image_choice" | "fill_blank" | "riddle" | "matching";

/** The smallest link to a quiz, as lessons, documents and villages list their quizzes. */
export interface QuizRef {
  slug: string;
  title: string;
  grade_level: GradeLevel;
  time_limit_minutes: number | null;
}

export interface QuizSummary {
  slug: string;
  title: string;
  description: string;
  grade_level: GradeLevel;
  time_limit_minutes: number | null;
  question_count: number;
  lesson: LessonRef | null;
  villages: VillageRef[];
}

/** A question as the student sees it: the API never sends answers before grading. */
export interface QuizQuestion {
  id: number;
  order: number;
  kind: QuestionKind;
  prompt: string;
  image_url: string;
  points: number;
  choices: { id: number; text: string }[];
  /** Matching only: the items to match, by pair id. */
  left_items: { id: number; left: string }[];
  /** Matching only: shuffled plain text to pick from. */
  right_items: string[];
}

export interface QuizDetail extends QuizSummary {
  shuffle_questions: boolean;
  questions: QuizQuestion[];
}

/** What the student gave for one question; the shape depends on the question kind. */
export type QuizResponse =
  | { choice: number }
  | { text: string }
  | { matches: Record<string, string> };

export interface QuestionResult {
  question: number;
  is_correct: boolean;
  points_awarded: number;
  points: number;
  solution: { choice?: number | null; answers?: string[]; matches?: Record<string, string> };
  /** Matching only: pair id -> matched correctly. */
  pair_results: Record<string, boolean>;
  explanation: string;
}

export interface QuizResult {
  score: number;
  max_score: number;
  /** True when the result was kept (signed-in students only). */
  saved: boolean;
  attempt: number | null;
  results: QuestionResult[];
}

export interface QuizAttempt {
  id: number;
  quiz: { slug: string; title: string };
  score: number;
  max_score: number;
  duration_seconds: number | null;
  submitted_at: string;
}

export interface QuizQuery {
  search?: string;
  grade_level?: string;
  /** A village code. */
  village?: string;
  /** A lesson slug. */
  lesson?: string;
  page?: number;
}

export function fetchQuizzes(query: QuizQuery = {}): Promise<Paginated<QuizSummary>> {
  return apiFetch<Paginated<QuizSummary>>("/quizzes/", { params: { ...query } });
}

/** Returns null when the quiz does not exist or has not been published yet. */
export async function fetchQuiz(slug: string): Promise<QuizDetail | null> {
  try {
    // Not cached: right-hand matching items and shuffled questions change on every visit.
    return await apiFetch<QuizDetail>(`/quizzes/${slug}/`, { revalidate: 0 });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Grades the answers. Signed in, the request carries the session so a student's result is
 * saved; otherwise it is graded as a guest.
 */
export function submitQuiz(
  slug: string,
  answers: ({ question: number } & QuizResponse)[],
  durationSeconds: number,
): Promise<QuizResult> {
  const path = `/quizzes/${slug}/submit/`;
  const body = { answers, duration_seconds: durationSeconds };
  return readSession() ? authSend<QuizResult>(path, { body }) : apiSend<QuizResult>(path, { body });
}

/** The signed-in user's results, newest first; pass a slug for one quiz. */
export async function fetchMyAttempts(quizSlug?: string): Promise<QuizAttempt[]> {
  const query = quizSlug ? `?quiz=${encodeURIComponent(quizSlug)}` : "";
  const page = await authSend<Paginated<QuizAttempt>>(`/quiz-attempts/${query}`, {
    method: "GET",
  });
  return page.results;
}

/** Every published quiz, following the pages; for pickers such as the class results form. */
export async function fetchAllQuizzes(): Promise<QuizSummary[]> {
  const quizzes: QuizSummary[] = [];
  for (let page = 1; ; page++) {
    const batch = await fetchQuizzes({ page: page > 1 ? page : undefined });
    quizzes.push(...batch.results);
    if (!batch.next) return quizzes;
  }
}

export interface StudentQuizResult {
  id: number;
  username: string;
  display_name: string;
  attempt_count: number;
  best_score: number | null;
  last_score: number | null;
  last_submitted_at: string | null;
}

export interface QuestionStat {
  id: number;
  order: number;
  kind: QuestionKind;
  prompt: string;
  /** Students whose latest attempt answered this question. */
  answered: number;
  correct: number;
}

export interface ClassQuizResults {
  quiz: QuizRef;
  max_score: number;
  students: StudentQuizResult[];
  questions: QuestionStat[];
}

/** Teachers only: a class's results on one quiz (school and class as students typed them). */
export function fetchClassQuizResults(
  quiz: string,
  schoolName: string,
  className: string,
): Promise<ClassQuizResults> {
  const query = new URLSearchParams({ quiz, school_name: schoolName, class_name: className });
  return authSend<ClassQuizResults>(`/teaching/quiz-results/?${query}`, { method: "GET" });
}
