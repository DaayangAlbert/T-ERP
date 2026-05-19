import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "T-ERP — ERP BTP Cameroun",
  description: "Plateforme ERP multi-tenant pour les entreprises du BTP au Cameroun.",
  icons: {
    icon: "/logo-terp.svg",
    shortcut: "/logo-terp.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "T-ERP",
    statusBarStyle: "default",
  },
  // Nouveau standard PWA (remplace apple-mobile-web-app-capable pour les navigateurs modernes)
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#A855F7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
