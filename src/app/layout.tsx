import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { DEFAULT_THEME, type ThemeKey } from "@/lib/constants/themes";
import "./globals.css";

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
  title: "Roost",
  description: "The household OS for families and roommates",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialTheme: ThemeKey = DEFAULT_THEME;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.id) {
      const [user] = await db
        .select({ theme: users.theme })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      if (user?.theme) {
        initialTheme = user.theme as ThemeKey;
      }
    }
  } catch {
    // No session or DB error — use default theme
  }

  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
