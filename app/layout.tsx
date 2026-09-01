import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUCK — Carousel Generator",
  description: "Generate Instagram carousel post drafts for review and manual posting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
