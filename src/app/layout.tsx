import type { Metadata, Viewport } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/providers/ThemeProvider";
import ObservabilityProvider from "@/components/providers/ObservabilityProvider";
import WebVitals from "@/components/providers/WebVitals";
import StructuredDataScript from "@/components/marketing/StructuredDataScript";
import { DEFAULT_THEME } from "@/lib/constants/themes";
import { getAppUrl, getMetadataBaseUrl, validateServerEnv } from "@/lib/env";
import {
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  getOrganizationJsonLd,
} from "@/lib/seo";
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
    default: `${SITE_NAME} | Household Management App for Families and Roommates`,
    template: "%s | Roost",
  },
  description: SITE_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
    title: `${SITE_NAME} | Household Management App for Families and Roommates`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} preview image`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Household Management App for Families and Roommates`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {getOrganizationJsonLd().map((item, index) => (
          <StructuredDataScript key={index} data={item} />
        ))}
        <ObservabilityProvider />
        <WebVitals />
        <ThemeProvider initialTheme={DEFAULT_THEME}>
          {children}
        </ThemeProvider>
        <Toaster
          position="top-right"
          richColors={false}
          toastOptions={{
            style: {
              background: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid var(--roost-border-bottom)",
              borderRadius: "16px",
              color: "var(--roost-text-primary)",
              fontFamily: "var(--font-nunito)",
              fontWeight: "700",
              fontSize: "14px",
              padding: "14px 16px",
              boxShadow: "none",
            },
            classNames: {
              toast: "roost-toast",
              title: "roost-toast-title",
              description: "roost-toast-description",
              actionButton: "roost-toast-action",
              cancelButton: "roost-toast-cancel",
              closeButton: "roost-toast-close",
              success: "roost-toast-success",
              error: "roost-toast-error",
              warning: "roost-toast-warning",
              info: "roost-toast-info",
            },
          }}
        />
      </body>
    </html>
  );
}
