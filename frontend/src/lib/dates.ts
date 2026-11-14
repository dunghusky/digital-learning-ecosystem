const DATE_TIME = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });

/** "4 thg 11, 2026 20:30" for due dates and hand-in times. */
export function formatDateTime(value: string): string {
  return DATE_TIME.format(new Date(value));
}

/** An ISO date for an `<input type="datetime-local">` value, in the browser's time zone. */
export function fromDateTimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
