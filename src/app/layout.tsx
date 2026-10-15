import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_COOKIE_NAME,
  parsePreferenceCookie,
} from "@/lib/preferences";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
  adjustFontFallback: false,
});

export const instant = false;

export const metadata: Metadata = {
  title: "AKSESPASS",
  description:
    "Sampaikan kebutuhan layanan kesehatan dengan kontrol persetujuan di tangan pasien.",
};

const DevAuditPanel =
  process.env.NODE_ENV === "development"
    ? dynamic(() =>
        import("@/components/dev-audit-panel").then(
          (mod) => mod.DevAuditPanel
        )
      )
    : () => null;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const prefRaw = cookieStore.get(PREFERENCE_COOKIE_NAME)?.value;
  const preferences = parsePreferenceCookie(prefRaw) ?? DEFAULT_PREFERENCES;

  return (
    <html
      lang="id"
      data-text-size={preferences.textSize}
      data-contrast={preferences.contrast}
      data-reading-mode={preferences.readingMode}
      className={`${atkinson.variable} ${atkinson.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page text-main font-normal">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-3 focus:bg-cyan-700 focus:text-white focus:font-bold focus:rounded-lg focus:shadow-sm"
        >
          Lewati ke konten utama
        </a>
        <ServiceWorkerRegister />
        {children}
        <div
          id="toast-root"
          className="pointer-events-none fixed inset-x-4 top-3 z-50 mx-auto flex max-w-md flex-col gap-2"
        />
        {process.env.NODE_ENV === "development" && <DevAuditPanel />}
      </body>
    </html>
  );
}
