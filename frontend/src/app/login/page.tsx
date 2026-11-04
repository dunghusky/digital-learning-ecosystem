import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { loadSceneVerse } from "@/components/auth/scene-verse";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title"), robots: { index: false } };
}

interface LoginPageProps {
  searchParams: Promise<{ registered?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ registered, next }, verse, t] = await Promise.all([
    searchParams,
    loadSceneVerse(),
    getTranslations("auth.login"),
  ]);

  return (
    <AuthShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      verse={verse}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            {t("toRegister")}
          </Link>
        </>
      }
    >
      <RedirectIfSignedIn next={next} />
      <LoginForm justRegistered={registered === "1"} next={next} />
    </AuthShell>
  );
}
