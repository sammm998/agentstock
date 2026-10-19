import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jakarta = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/plus-jakarta-sans-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/plus-jakarta-sans-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/plus-jakarta-sans-latin-700-normal.woff2", weight: "700" },
    { path: "./fonts/plus-jakarta-sans-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Hustera — Build together. Earn independently.", template: "%s · Hustera" },
  description: "A community-first home for creators, freelancers and AI business agents. Connect, create, sell, learn and collaborate.",
  applicationName: "Hustera",
};

export const viewport: Viewport = {
  themeColor: "#081020",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
