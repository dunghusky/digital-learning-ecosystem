import type { ReactNode } from "react";

import { AuthScene, type SceneVerse } from "@/components/auth/auth-scene";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  lead: string;
  verse: SceneVerse;
  children: ReactNode;
  /** Link line under the form, e.g. "No account yet? Sign up". */
  footer: ReactNode;
}

/** Two-column layout shared by login and sign-up: the animated scene beside the form card. */
export function AuthShell({ eyebrow, title, lead, verse, children, footer }: AuthShellProps) {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 -z-10 size-[32rem] animate-drift rounded-full bg-primary-soft blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className="order-2 lg:order-1">
          <AuthScene verse={verse} />
        </div>

        <section className="order-1 flex flex-col justify-center lg:order-2">
          <div className="animate-rise rounded-card border border-line bg-surface p-6 shadow-card sm:p-9">
            <p className="text-xs font-bold tracking-[0.18em] text-primary-strong uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 leading-relaxed text-ink-muted">{lead}</p>
            <div className="mt-7">{children}</div>
          </div>
          <p className="mt-5 text-center text-ink-muted">{footer}</p>
        </section>
      </div>
    </main>
  );
}
