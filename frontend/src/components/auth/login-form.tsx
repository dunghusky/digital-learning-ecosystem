"use client";

import { CircleCheck, KeyRound, Loader2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Field, focusFirstInvalid, requiredMessage } from "@/components/auth/form-field";
import { buttonClass } from "@/components/ui/button";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { safeNextPath, saveSession } from "@/lib/auth/session";

interface LoginFormProps {
  /** Shows the welcome banner after a successful sign-up. */
  justRegistered: boolean;
  next?: string;
}

export function LoginForm({ justRegistered, next }: LoginFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ username?: string; password?: string }>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const empty = {
      username: username.trim() ? undefined : requiredMessage(t, t("form.username")),
      password: password ? undefined : requiredMessage(t, t("form.password")),
    };
    setMissing(empty);
    if (empty.username || empty.password) {
      setError(null);
      focusFirstInvalid(event.currentTarget);
      return;
    }
    setPending(true);
    setError(null);
    try {
      saveSession(await login(username.trim(), password));
      router.replace(safeNextPath(next));
      router.refresh();
    } catch (caught) {
      setError(loginErrorKey(caught, t));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {justRegistered && !error && (
        <p
          role="status"
          className="flex animate-pop items-start gap-2 rounded-2xl bg-secondary-soft px-4 py-3 text-sm font-medium text-secondary"
        >
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t("login.registered")}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary-strong"
        >
          {error}
        </p>
      )}

      <Field
        label={t("form.username")}
        icon={UserRound}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        error={missing.username}
        value={username}
        onChange={(event) => {
          setUsername(event.target.value);
          setMissing((current) => ({ ...current, username: undefined }));
        }}
      />
      <Field
        label={t("form.password")}
        icon={KeyRound}
        type="password"
        name="password"
        autoComplete="current-password"
        required
        error={missing.password}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setMissing((current) => ({ ...current, password: undefined }));
        }}
      />

      <button
        type="submit"
        disabled={pending}
        className={buttonClass("primary", "w-full text-base disabled:opacity-70")}
      >
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {pending ? t("login.submitting") : t("login.submit")}
      </button>
    </form>
  );
}

function loginErrorKey(error: unknown, t: ReturnType<typeof useTranslations<"auth">>): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return t("errors.badCredentials");
    if (error.status === 429) return t("errors.throttled");
    if (error.status === 0) return t("errors.network");
  }
  return t("errors.unknown");
}
