import { ApiError, apiFetch, type Paginated } from "./client";
import type { VillageSummary } from "./villages";

export type Genre =
  | "folk_verse"
  | "proverb"
  | "work_song"
  | "narrative_verse"
  | "riddle"
  | "nursery_rhyme"
  | "legend"
  | "folk_tale"
  | "poem"
  | "essay"
  | "reportage"
  | "interview";

export type GradeLevel = "primary" | "secondary" | "all";

export type License = "folk_attributed" | "own_work" | "permission_granted" | "cc_by" | "unknown";

export type VillageRef = Pick<VillageSummary, "code" | "name" | "craft_type">;

export interface Theme {
  slug: string;
  name: string;
}

export interface GlossaryTerm {
  term: string;
  explanation: string;
}

export interface DocumentSummary {
  slug: string;
  title: string;
  genre: Genre;
  grade_level: GradeLevel;
  summary: string;
  /** The first few non-blank lines of the body, for verse and riddle cards. */
  excerpt: string[];
  /** Only riddles carry an answer; empty for every other genre. */
  answer: string;
  villages: VillageRef[];
  themes: Theme[];
}

export interface DocumentDetail extends DocumentSummary {
  body: string;
  reading_questions: string[];
  glossary: GlossaryTerm[];
  author: string;
  collector: string;
  source: string;
  source_url: string;
  license: License;
  published_at: string | null;
  updated_at: string;
  related: DocumentSummary[];
}

export interface GenreCount {
  genre: Genre;
  count: number;
}

export interface DocumentQuery {
  search?: string;
  genre?: string;
  grade_level?: string;
  /** A village code. */
  village?: string;
  /** A theme slug. */
  theme?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export function fetchDocuments(query: DocumentQuery = {}): Promise<Paginated<DocumentSummary>> {
  return apiFetch<Paginated<DocumentSummary>>("/documents/", { params: { ...query } });
}

/** Number of published documents per genre, most common first; genres with none are absent. */
export function fetchGenreCounts(): Promise<GenreCount[]> {
  return apiFetch<GenreCount[]>("/documents/genres/");
}

async function orNullOn404<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Returns null when the document does not exist or has not been published yet. */
export function fetchDocument(slug: string): Promise<DocumentDetail | null> {
  return orNullOn404(apiFetch<DocumentDetail>(`/documents/${slug}/`));
}

/** The document of the day (changes daily); null when nothing in that genre is published. */
export function fetchFeaturedDocument(genre?: Genre): Promise<DocumentDetail | null> {
  return orNullOn404(apiFetch<DocumentDetail>("/documents/featured/", { params: { genre } }));
}

/** Slug of a random published document matching the query; null when nothing matches. */
export async function fetchRandomDocumentSlug(query: DocumentQuery = {}): Promise<string | null> {
  const picked = await orNullOn404(
    apiFetch<{ slug: string }>("/documents/random/", { params: { ...query }, revalidate: 0 }),
  );
  return picked?.slug ?? null;
}
