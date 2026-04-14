import type { Metadata, Viewport } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/providers/ThemeProvider";
import ObservabilityProvider from "@/components/providers/ObservabilityProvider";
import WebVitals from "@/components/providers/WebVitals";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { DEFAULT_THEME } from "@/lib/constants/themes";
import { getAppUrl, getMetadataBaseUrl, validateServerEnv } from "@/lib/env";
import "./globals.css";

validateServerEnv();

const appUrl = getAppUrl();

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: {
    default: "Roost",
    template: "%s | Roost",
  },
  description: "The household app for families and roommates.",
  keywords: [
    "household management",
    "chores",
    "grocery list",
    "bill splitting",
    "family organizer",
    "roommate app",
  ],
  authors: [{ name: "Roost" }],
  creator: "Roost",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.ico",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    title: "Roost",
    description: "Homes run better with Roost.",
    siteName: "Roost",
    // images resolved automatically from src/app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "Roost",
    description: "Homes run better with Roost.",
    // images resolved automatically from src/app/opengraph-image.tsx
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Roost",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialTheme: string = DEFAULT_THEME;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.id) {
      const [user] = await db
        .select({ theme: users.theme })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      if (user?.theme) {
        initialTheme = user.theme;
      }
    }
  } catch {
    // No session or DB error — use default theme
  }

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ObservabilityProvider />
        <WebVitals />
        <ThemeProvider initialTheme={initialTheme}>
          {children}
        </ThemeProvider>
        <Toaster
          position="top-right"
          richColors={false}
          toastOptions={{
            style: {
              background: 'var(--roost-surface)',
              border: '1.5px solid var(--roost-border)',
              borderBottom: '4px solid var(--roost-border-bottom)',
              borderRadius: '16px',
              color: 'var(--roost-text-primary)',
              fontFamily: 'var(--font-nunito)',
              fontWeight: '700',
              fontSize: '14px',
              padding: '14px 16px',
              boxShadow: 'none',
            },
            classNames: {
              toast: 'roost-toast',
              title: 'roost-toast-title',
              description: 'roost-toast-description',
              actionButton: 'roost-toast-action',
              cancelButton: 'roost-toast-cancel',
              closeButton: 'roost-toast-close',
              success: 'roost-toast-success',
              error: 'roost-toast-error',
              warning: 'roost-toast-warning',
              info: 'roost-toast-info',
            },
          }}
        />
      </body>
    </html>
  );
}
