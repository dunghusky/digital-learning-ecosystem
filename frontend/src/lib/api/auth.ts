import { ApiError, apiSend } from "./client";

export type Role = "student" | "teacher" | "school_admin" | "editor";

export interface CurrentUser {
  id: number;
  username: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: Role;
  school_name: string;
  class_name: string;
  date_joined: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  school_name: string;
  class_name: string;
  phone?: string;
  email?: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

/** Creates a student account. It does not sign in: the student logs in afterwards. */
export function register(input: RegisterInput): Promise<CurrentUser> {
  return apiSend<CurrentUser>("/auth/register/", { body: input });
}

export function login(username: string, password: string): Promise<TokenPair> {
  return apiSend<TokenPair>("/auth/token/", { body: { username, password } });
}

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** First message per field from a DRF 400 body (`{ field: ["msg", ...] }`). */
export function fieldErrorsOf(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || error.status !== 400 || typeof error.body !== "object") {
    return {};
  }
  const errors: FieldErrors = {};
  for (const [field, messages] of Object.entries(error.body ?? {})) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (typeof first === "string") {
      errors[field] = first;
    }
  }
  return errors;
}
