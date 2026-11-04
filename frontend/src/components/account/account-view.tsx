"use client";

import { CalendarDays, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";

import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-provider";

/** "My account": who you are, the details you can edit, and the password form. */
export function AccountView() {
  const t = useTranslations("auth.account");
  const format = useFormatter();
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "anonymous") {
      router.replace("/login?next=/account");
    }
  }, [state.status, router]);

  if (state.status !== "authenticated") {
    return (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    );
  }

  const { user } = state;
  return (
    <div className="space-y-6">
      <section className="flex animate-rise items-center gap-5 rounded-card border border-line bg-[linear-gradient(135deg,#fff4e6,#fde1cc)] p-6 shadow-card sm:p-8">
        <span
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface text-2xl font-extrabold text-primary-strong uppercase shadow-card"
        >
          {user.display_name.charAt(0)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-3xl">
            {user.display_name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" aria-hidden />
              {t(`roles.${user.role}`)} · @{user.username}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {t("joined", {
                date: format.dateTime(new Date(user.date_joined), { dateStyle: "long" }),
              })}
            </span>
          </p>
        </div>
      </section>

      <Card title={t("profileTitle")} lead={t("profileLead")} delay="80ms">
        <ProfileForm user={user} />
      </Card>
      <Card title={t("passwordTitle")} lead={t("passwordLead")} delay="160ms">
        <PasswordForm />
      </Card>
    </div>
  );
}

function Card({
  title,
  lead,
  delay,
  children,
}: {
  title: string;
  lead: string;
  delay: string;
  children: ReactNode;
}) {
  return (
    <section
      className="animate-rise rounded-card border border-line bg-surface p-6 shadow-card sm:p-8"
      style={{ animationDelay: delay }}
    >
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <p className="mt-1 text-ink-muted">{lead}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
