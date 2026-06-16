import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../styles/globals.css";
import "../styles/animations.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { RecentlyVerifiedTicker } from "@/components/feed/RecentlyVerifiedTicker";
import { APP_NAME, APP_DESCRIPTION, APP_TAGLINE } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  keywords: ["Solana", "token", "trust", "verification", "ownership", "DeFi", "crypto", "rug check", "trust score"],
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: APP_NAME, description: APP_DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <RecentlyVerifiedTicker />
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <Footer />
        <ToastProvider />
        <CommandPalette />
      </body>
    </html>
  );
}
