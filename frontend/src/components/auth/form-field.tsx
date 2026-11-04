"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type InputHTMLAttributes, useId, useState } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  icon: LucideIcon;
  /** Shown under the input when there is no error. */
  hint?: string;
  error?: string;
  /** Marks the label with a red asterisk; the form itself reports what is missing. */
  required?: boolean;
}

/**
 * Large, friendly input for the auth forms (primary-school pupils type on phones): a big
 * touch target, an icon, and the error or hint wired up with aria-describedby.
 */
export function Field({ label, icon: Icon, hint, error, required, type, ...input }: FieldProps) {
  const t = useTranslations("auth.form");
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const note = error ?? hint;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        )}
      </label>
      <div
        className={`mt-1.5 flex min-h-13 items-center gap-3 rounded-2xl border bg-surface px-4 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft ${
          error ? "border-primary-strong" : "border-line"
        }`}
      >
        <Icon className="size-5 shrink-0 text-ink-muted" aria-hidden />
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none placeholder:text-ink-muted/60"
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? t("hidePassword") : t("showPassword")}
            aria-pressed={revealed}
            className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            {revealed ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {note && (
        <p
          id={`${id}-note`}
          className={`mt-1.5 text-sm ${error ? "font-medium text-primary-strong" : "text-ink-muted"}`}
        >
          {note}
        </p>
      )}
    </div>
  );
}

/** Moves focus to the first field with an error, once React has rendered the errors. */
export function focusFirstInvalid(form: HTMLFormElement): void {
  requestAnimationFrame(() => {
    form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  });
}

/** "Vui lòng điền tên đăng nhập." The label is lower-cased to sit mid-sentence. */
export function requiredMessage(t: ReturnType<typeof useTranslations<"auth">>, label: string) {
  return t("errors.required", { field: label.toLocaleLowerCase("vi") });
}
