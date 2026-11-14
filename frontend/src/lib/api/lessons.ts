import { ApiError, apiFetch, type Paginated } from "./client";
import type { DocumentDetail, Theme, VillageRef } from "./documents";
import type { QuizRef } from "./quizzes";

export type Subject = "vietnamese" | "literature";

export type TaskKind = "reading" | "writing" | "creative" | "fieldwork";

/** The smallest link to a lesson, as documents and villages list their lessons. */
export interface LessonRef {
  slug: string;
  title: string;
  subject: Subject;
  grade: number;
}

export interface LessonSummary extends LessonRef {
  objectives: string[];
  task_count: number;
  document_count: number;
  villages: VillageRef[];
}

/** An archive document as read inside a lesson: the full text, without the archive extras. */
export type LessonReadingDocument = Pick<
  DocumentDetail,
  "slug" | "title" | "genre" | "body" | "answer" | "glossary" | "author" | "collector" | "source"
> & { themes: Theme[] };

export interface LessonReading {
  order: number;
  /** The teacher's note, e.g. "Read aloud before task 1". */
  note: string;
  document: LessonReadingDocument;
}

export interface LessonTask {
  id: number;
  order: number;
  kind: TaskKind;
  prompt: string;
  hint: string;
}

export interface LessonDetail extends LessonSummary {
  introduction: string;
  expected_output: string;
  author_name: string;
  readings: LessonReading[];
  tasks: LessonTask[];
  quizzes: QuizRef[];
  published_at: string | null;
  updated_at: string;
}

export interface LessonQuery {
  search?: string;
  subject?: string;
  grade?: string;
  /** A village code. */
  village?: string;
  /** A document slug. */
  document?: string;
  page?: number;
}

export function fetchLessons(query: LessonQuery = {}): Promise<Paginated<LessonSummary>> {
  return apiFetch<Paginated<LessonSummary>>("/lessons/", { params: { ...query } });
}

/** Returns null when the lesson does not exist or has not been published yet. */
export async function fetchLesson(slug: string): Promise<LessonDetail | null> {
  try {
    return await apiFetch<LessonDetail>(`/lessons/${slug}/`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Every published lesson, following the pages; for pickers such as the assignment form. */
export async function fetchAllLessons(): Promise<LessonSummary[]> {
  const lessons: LessonSummary[] = [];
  for (let page = 1; ; page++) {
    const batch = await fetchLessons({ page: page > 1 ? page : undefined });
    lessons.push(...batch.results);
    if (!batch.next) return lessons;
  }
}
