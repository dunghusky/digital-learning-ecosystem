import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { RegisterForm } from "@/components/auth/register-form";
import { loadSceneVerse } from "@/components/auth/scene-verse";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title"), robots: { index: false } };
}

export default async function RegisterPage() {
  const [verse, t] = await Promise.all([loadSceneVerse(), getTranslations("auth.register")]);

  return (
    <AuthShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      verse={verse}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("toLogin")}
          </Link>
        </>
      }
    >
      <RedirectIfSignedIn />
      <RegisterForm />
    </AuthShell>
  );
}
