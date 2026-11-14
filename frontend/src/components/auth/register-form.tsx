"use client";

import { AtSign, KeyRound, Loader2, Phone, School, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Field, focusFirstInvalid, requiredMessage } from "@/components/auth/form-field";
import { buttonClass } from "@/components/ui/button";
import { type FieldErrors, fieldErrorsOf, register, type RegisterInput } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
  normalizeClassName,
  normalizePhone,
  PHONE_PATTERN,
  USERNAME_PATTERN,
} from "@/lib/auth/validation";

type FieldName = keyof RegisterInput;

const EMPTY: Required<RegisterInput> = {
  username: "",
  password: "",
  school_name: "",
  class_name: "",
  phone: "",
  email: "",
};

/** Sign-up needs these; phone and email are optional. */
const REQUIRED = ["username", "password", "school_name", "class_name"] as const;

/** Message key of each field's label, for "Please fill in <label>". */
const LABEL_KEYS: Record<FieldName, string> = {
  username: "username",
  password: "password",
  school_name: "school",
  class_name: "class",
  phone: "phone",
  email: "email",
};

/** The pilot school, offered as a suggestion; students from elsewhere just type theirs. */
const SUGGESTED_SCHOOLS = ["Trường Tiểu học và THCS Thiện Thành"];

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function bind(name: FieldName) {
    return {
      name,
      value: values[name],
      error: errors[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues((current) => ({ ...current, [name]: event.target.value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
      },
    };
  }

  function validate(input: Required<RegisterInput>): FieldErrors<FieldName> {
    const found: FieldErrors<FieldName> = {};
    for (const name of REQUIRED) {
      if (!input[name]) found[name] = requiredMessage(t, t(`form.${LABEL_KEYS[name]}`));
    }
    if (!found.username && !USERNAME_PATTERN.test(input.username)) {
      found.username = t("errors.username");
    }
    if (!found.password && input.password.length < MIN_PASSWORD_LENGTH) {
      found.password = t("errors.passwordShort");
    }
    if (input.phone && !PHONE_PATTERN.test(input.phone)) found.phone = t("errors.phone");
    if (input.email && !EMAIL_PATTERN.test(input.email)) found.email = t("errors.email");
    return found;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = {
      ...values,
      username: values.username.trim(),
      school_name: values.school_name.trim(),
      class_name: normalizeClassName(values.class_name),
      phone: normalizePhone(values.phone),
      email: values.email.trim(),
    };
    const found = validate(input);
    setErrors(found);
    const missing = REQUIRED.filter((name) => !input[name]).length;
    setFormError(missing > 0 ? t("errors.missingCount", { count: missing }) : null);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(form);
      return;
    }

    setPending(true);
    try {
      await register(input);
      router.push("/login?registered=1");
    } catch (caught) {
      const server = fieldErrorsOf(caught) as FieldErrors<FieldName>;
      // The format is checked above, so a username error from the server means "taken".
      if (server.username) server.username = t("errors.usernameTaken");
      setErrors(server);
      if (Object.keys(server).length === 0) setFormError(formErrorOf(caught, t));
      else focusFirstInvalid(form);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <p
          role="alert"
          className="rounded-2xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary-strong"
        >
          {formError}
        </p>
      )}

      <p className="text-sm text-ink-muted">{t("form.requiredNote")}</p>

      <Field
        label={t("form.username")}
        icon={UserRound}
        hint={t("form.usernameHint")}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        {...bind("username")}
      />
      <Field
        label={t("form.password")}
        icon={KeyRound}
        type="password"
        hint={t("form.passwordHint")}
        autoComplete="new-password"
        required
        {...bind("password")}
      />

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field
          label={t("form.school")}
          icon={School}
          list="suggested-schools"
          placeholder={t("form.schoolPlaceholder")}
          autoComplete="organization"
          required
          {...bind("school_name")}
        />
        <Field
          label={t("form.class")}
          icon={Users}
          placeholder={t("form.classPlaceholder")}
          autoCapitalize="characters"
          required
          {...bind("class_name")}
        />
      </div>
      <datalist id="suggested-schools">
        {SUGGESTED_SCHOOLS.map((school) => (
          <option key={school} value={school} />
        ))}
      </datalist>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("form.phone")}
          icon={Phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...bind("phone")}
        />
        <Field
          label={t("form.email")}
          icon={AtSign}
          type="email"
          autoComplete="email"
          {...bind("email")}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={buttonClass("primary", "w-full text-base disabled:opacity-70")}
      >
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {pending ? t("register.submitting") : t("register.submit")}
      </button>
    </form>
  );
}

function formErrorOf(error: unknown, t: ReturnType<typeof useTranslations<"auth">>): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return t("errors.throttled");
    if (error.status === 0) return t("errors.network");
  }
  return t("errors.unknown");
}
