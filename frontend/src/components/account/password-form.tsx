"use client";

import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { SaveStatus } from "@/components/account/profile-form";
import { Field, focusFirstInvalid, requiredMessage } from "@/components/auth/form-field";
import { buttonClass } from "@/components/ui/button";
import { type FieldErrors, fieldErrorsOf } from "@/lib/api/auth";
import { authSend } from "@/lib/auth/session";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";

type PasswordField = "current_password" | "new_password" | "confirm";

const EMPTY: Record<PasswordField, string> = {
  current_password: "",
  new_password: "",
  confirm: "",
};

/** Changes the password; the new one is typed twice since it is hidden while typing. */
export function PasswordForm() {
  const t = useTranslations("auth");
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<PasswordField>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  function bind(name: PasswordField) {
    return {
      name,
      type: "password",
      required: true,
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
    const found: FieldErrors<PasswordField> = {};
    if (!values.current_password) {
      found.current_password = requiredMessage(t, t("account.currentPassword"));
    }
    if (!values.new_password) {
      found.new_password = requiredMessage(t, t("account.newPassword"));
    } else if (values.new_password.length < MIN_PASSWORD_LENGTH) {
      found.new_password = t("errors.passwordShort");
    }
    if (values.new_password && values.confirm !== values.new_password) {
      found.confirm = t("errors.passwordMismatch");
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(form);
      return;
    }

    setStatus("saving");
    try {
      await authSend("/auth/password/change/", {
        body: { current_password: values.current_password, new_password: values.new_password },
      });
      setValues(EMPTY);
      setStatus("saved");
    } catch (caught) {
      const server = fieldErrorsOf(caught) as FieldErrors<PasswordField>;
      // The backend's only check on the current password is "does it match".
      if (server.current_password) server.current_password = t("errors.currentPasswordWrong");
      setErrors(server);
      setStatus(Object.keys(server).length > 0 ? "idle" : "failed");
      if (Object.keys(server).length > 0) focusFirstInvalid(form);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        label={t("account.currentPassword")}
        icon={LockKeyhole}
        autoComplete="current-password"
        {...bind("current_password")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("account.newPassword")}
          icon={KeyRound}
          autoComplete="new-password"
          hint={t("form.passwordHint")}
          {...bind("new_password")}
        />
        <Field
          label={t("account.confirmPassword")}
          icon={KeyRound}
          autoComplete="new-password"
          {...bind("confirm")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "saving"}
          className={buttonClass("outline", "disabled:opacity-70")}
        >
          {status === "saving" && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {t("account.changePassword")}
        </button>
        {status === "saved" ? (
          <p role="status" className="animate-pop text-sm font-semibold text-secondary">
            {t("account.passwordChanged")}
          </p>
        ) : (
          <SaveStatus status={status} />
        )}
      </div>
    </form>
  );
}
