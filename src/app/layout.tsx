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
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
