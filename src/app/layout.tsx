import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UserProvider } from "@/components/UserProvider";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Reelwise: find movies you'll actually enjoy", template: "%s | Reelwise" },
  description: "Discover movies you'll love. Browse, search and filter thousands of films, get smart 'if you liked this' picks, and build your own watchlist.",
  openGraph: { type: "website", siteName: "Reelwise", title: "Reelwise: find movies you'll actually enjoy" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: "#0b0b10" };

// Runs before first paint so there is no flash of the wrong theme. Dark is the default.
const themeScript = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${display.variable} antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg">
          Skip to content
        </a>
        <UserProvider>
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}
