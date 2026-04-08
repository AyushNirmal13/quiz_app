import type { Metadata } from "next";
import { EB_Garamond, Inter, Space_Mono } from "next/font/google";

import "./globals.css";

const headingFont = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const labelFont = Space_Mono({
  subsets: ["latin"],
  variable: "--font-label",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Quiz Central",
  description: "AI-powered secure online quiz system frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable} ${labelFont.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
