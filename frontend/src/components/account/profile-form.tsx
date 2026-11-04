"use client";

import { AtSign, CircleCheck, Loader2, Phone, School, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Field, focusFirstInvalid, requiredMessage } from "@/components/auth/form-field";
import { buttonClass } from "@/components/ui/button";
import { type CurrentUser, type FieldErrors, fieldErrorsOf } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-provider";
import { authSend } from "@/lib/auth/session";
import {
  EMAIL_PATTERN,
  normalizeClassName,
  normalizePhone,
  PHONE_PATTERN,
} from "@/lib/auth/validation";

type ProfileField = "school_name" | "class_name" | "phone" | "email";
type Profile = Record<ProfileField, string>;

function profileOf(user: CurrentUser): Profile {
  return {
    school_name: user.school_name,
    class_name: user.class_name,
    phone: user.phone,
    email: user.email,
  };
}

/** Edits the details a student gave at sign-up. Username and role cannot be changed. */
export function ProfileForm({ user }: { user: CurrentUser }) {
  const t = useTranslations("auth");
  const { reload } = useAuth();
  const [values, setValues] = useState(() => profileOf(user));
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  function bind(name: ProfileField) {
    return {
      name,
      value: values[name],
      error: errors[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues((current) => ({ ...current, [name]: event.target.value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
        setStatus("idle");
      },
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input: Profile = {
      school_name: values.school_name.trim(),
      class_name: normalizeClassName(values.class_name),
      phone: normalizePhone(values.phone),
      email: values.email.trim(),
    };

    const found: FieldErrors<ProfileField> = {};
    if (!input.school_name) found.school_name = requiredMessage(t, t("form.school"));
    if (!input.class_name) found.class_name = requiredMessage(t, t("form.class"));
    if (input.phone && !PHONE_PATTERN.test(input.phone)) found.phone = t("errors.phone");
    if (input.email && !EMAIL_PATTERN.test(input.email)) found.email = t("errors.email");
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(form);
      return;
    }

    setStatus("saving");
    try {
      await authSend<CurrentUser>("/auth/me/", { method: "PATCH", body: input });
      setValues(input);
      await reload();
      setStatus("saved");
    } catch (caught) {
      const server = fieldErrorsOf(caught) as FieldErrors<ProfileField>;
      setErrors(server);
      setStatus("failed");
      if (Object.keys(server).length > 0) focusFirstInvalid(form);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field
          label={t("form.school")}
          icon={School}
          required
          autoComplete="organization"
          {...bind("school_name")}
        />
        <Field
          label={t("form.class")}
          icon={Users}
          required
          autoCapitalize="characters"
          {...bind("class_name")}
        />
      </div>
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

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "saving"}
          className={buttonClass("primary", "disabled:opacity-70")}
        >
          {status === "saving" && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {status === "saving" ? t("account.saving") : t("account.save")}
        </button>
        <SaveStatus status={status} />
      </div>
    </form>
  );
}

export function SaveStatus({ status }: { status: "idle" | "saving" | "saved" | "failed" }) {
  const t = useTranslations("auth");
  if (status === "saved") {
    return (
      <p
        role="status"
        className="flex animate-pop items-center gap-1.5 text-sm font-semibold text-secondary"
      >
        <CircleCheck className="size-5" aria-hidden />
        {t("account.saved")}
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p role="alert" className="text-sm font-medium text-primary-strong">
        {t("account.saveFailed")}
      </p>
    );
  }
  return null;
}
