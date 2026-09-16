import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "Quang Tri Craft Villages",
  description: "Digitizing heritage – Awakening love for our homeland.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={beVietnamPro.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
