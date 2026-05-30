import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono, Syne } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "AppForge", template: "%s — AppForge" },
  description: "Metadata-driven application runtime. Drop JSON, get a full-stack app.",
  keywords: ["app generator", "no-code", "low-code", "json config", "full stack"],
  authors: [{ name: "AppForge" }],
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  openGraph: {
    title:       "AppForge — AI App Generator",
    description: "Convert JSON configuration into working full-stack applications.",
    type:        "website",
    locale:      "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${dmMono.variable} ${syne.variable} font-sans antialiased bg-forge-bg text-gray-100`}>
        {children}
      </body>
    </html>
  );
}
