import { authSend } from "@/lib/auth/session";

import { ApiError } from "./client";
import type { LessonRef } from "./lessons";

export interface Answer {
  task: number;
  text: string;
}

export interface Feedback {
  comment: string;
  /** Out of 10; null for comment-only feedback. */
  score: number | null;
  teacher_name: string;
  updated_at: string;
}

export interface Submission {
  id: number;
  status: "draft" | "submitted";
  submitted_at: string | null;
  is_late: boolean;
  answers: Answer[];
  feedback: Feedback | null;
  updated_at: string;
}

export interface StudentAssignment {
  id: number;
  lesson: LessonRef;
  teacher_name: string;
  due_at: string | null;
  note: string;
  is_overdue: boolean;
  submission: Submission | null;
}

/** Assignments given to the signed-in student's school and class. */
export function fetchMyAssignments(): Promise<StudentAssignment[]> {
  return authSend<StudentAssignment[]>("/assignments/", { method: "GET" });
}

/** The student's work on an assignment; null before the first draft is saved. */
export async function fetchSubmission(assignmentId: number): Promise<Submission | null> {
  try {
    return await authSend<Submission>(`/assignments/${assignmentId}/submission/`, {
      method: "GET",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function saveDraft(assignmentId: number, answers: Answer[]): Promise<Submission> {
  return authSend<Submission>(`/assignments/${assignmentId}/submission/`, {
    method: "PUT",
    body: { answers },
  });
}

/** Saves the answers and hands the work in; it cannot change afterwards (409 on retry). */
export function submitWork(assignmentId: number, answers: Answer[]): Promise<Submission> {
  return authSend<Submission>(`/assignments/${assignmentId}/submit/`, { body: { answers } });
}

// --- Teacher --------------------------------------------------------------------------------

export interface TeacherAssignment {
  id: number;
  /** The lesson slug, as sent when creating. */
  lesson: string;
  lesson_detail: LessonRef;
  school_name: string;
  class_name: string;
  due_at: string | null;
  note: string;
  is_overdue: boolean;
  submitted_count: number;
  created_at: string;
}

export interface AssignmentInput {
  lesson: string;
  school_name: string;
  class_name: string;
  due_at: string | null;
  note: string;
}

export interface Person {
  id: number;
  username: string;
  display_name: string;
}

/** One row of the class list: a student and their work (null when not started). */
export interface ClassSubmission {
  student: Person;
  submission: Submission | null;
}

export interface FeedbackInput {
  comment: string;
  score: number | null;
}

export function fetchTeachingAssignments(): Promise<TeacherAssignment[]> {
  return authSend<TeacherAssignment[]>("/teaching/assignments/", { method: "GET" });
}

/** Null when the assignment does not exist or belongs to another teacher. */
export async function fetchTeachingAssignment(id: number): Promise<TeacherAssignment | null> {
  try {
    return await authSend<TeacherAssignment>(`/teaching/assignments/${id}/`, { method: "GET" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function createAssignment(input: AssignmentInput): Promise<TeacherAssignment> {
  return authSend<TeacherAssignment>("/teaching/assignments/", { body: input });
}

export function deleteAssignment(id: number): Promise<void> {
  return authSend<void>(`/teaching/assignments/${id}/`, { method: "DELETE" });
}

export function fetchClassSubmissions(assignmentId: number): Promise<ClassSubmission[]> {
  return authSend<ClassSubmission[]>(`/teaching/assignments/${assignmentId}/submissions/`, {
    method: "GET",
  });
}

/** Gives or replaces the feedback on handed-in work; returns the updated submission. */
export function saveFeedback(submissionId: number, input: FeedbackInput): Promise<Submission> {
  return authSend<Submission>(`/teaching/submissions/${submissionId}/feedback/`, {
    method: "PUT",
    body: input,
  });
}
