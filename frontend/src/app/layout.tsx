import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
});

/** Folk verse and riddles in the archive read like printed poetry. */
const notoSerif = Noto_Serif({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
});

/** Absolute base for canonical and OpenGraph URLs; set NEXT_PUBLIC_SITE_URL in production. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("description"),
    openGraph: { siteName: t("name"), locale: "vi_VN", type: "website" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} className={`${beVietnamPro.variable} ${notoSerif.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-ink antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
