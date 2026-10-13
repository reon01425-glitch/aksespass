import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "AKSESPASS",
  description:
    "Sampaikan kebutuhan layanan kesehatan dengan kontrol persetujuan di tangan pasien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${atkinson.variable} ${atkinson.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page text-main font-normal">
        {children}
      </body>
    </html>
  );
}
