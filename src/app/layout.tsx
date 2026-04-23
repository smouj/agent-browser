import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentBrowser - AI Browser Automation",
  description: "Control real browsers via REST API from any AI agent, LLM, or CLI. Built with Playwright, Next.js, and TypeScript.",
  keywords: ["browser automation", "playwright", "ai agent", "headless browser", "web scraping", "rest api", "computer vision"],
  authors: [{ name: "AgentBrowser Contributors" }],
  icons: {
    icon: "/browser-logo.png",
  },
  openGraph: {
    title: "AgentBrowser - AI Browser Automation",
    description: "Open-source AI browser automation platform. Control real browsers via REST API.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
