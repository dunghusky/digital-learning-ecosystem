/** Client-side mirrors of the backend rules, so most mistakes are caught before a round trip. */
export const USERNAME_PATTERN = /^[A-Za-z0-9.@+_-]{3,150}$/;
export const PHONE_PATTERN = /^\+?[0-9]{9,15}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/** Spaces, dots and dashes people type inside phone numbers ("091 234-5678"). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, "");
}

/** Class names are written in capitals: "6a" becomes "6A". */
export function normalizeClassName(name: string): string {
  return name.trim().toUpperCase();
}
