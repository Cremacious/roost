"use client";

import "./globals.css";

import Link from "next/link";
import { Nunito, Geist_Mono } from "next/font/google";
import { useEffect } from "react";
import { Bird, Home, RotateCcw } from "lucide-react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full" style={{ backgroundColor: "var(--roost-bg)" }}>
        <title>Roost | Something went wrong</title>
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <section
            className="w-full max-w-2xl overflow-hidden rounded-[32px]"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "8px solid #D97706",
            }}
          >
            <div
              className="px-8 py-10 sm:px-10"
              style={{
                background:
                  "linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(255,255,255,0.96) 60%)",
              }}
            >
              <div
                className="inline-flex h-16 w-16 items-center justify-center rounded-3xl"
                style={{
                  backgroundColor: "rgba(245,158,11,0.14)",
                  border: "1.5px solid rgba(217,119,6,0.2)",
                }}
              >
                <Bird className="size-8 text-[#B45309]" />
              </div>

              <div className="mt-6 max-w-xl space-y-3">
                <p
                  className="text-sm uppercase tracking-[0.24em]"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 800 }}
                >
                  Global fallback
                </p>
                <h1
                  className="text-3xl sm:text-5xl"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
                >
                  Roost needs a clean refresh.
                </h1>
                <p
                  className="text-sm leading-6 sm:text-base"
                  style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
                >
                  The app shell hit an unexpected failure before the page could finish rendering.
                  Retry once, and if it still fails, head back home and keep from getting stuck.
                </p>
                {error.digest ? (
                  <p
                    className="text-xs uppercase tracking-[0.18em]"
                    style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                  >
                    Reference {error.digest}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 px-8 py-6 sm:flex-row sm:px-10">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm"
                style={{
                  backgroundColor: "var(--roost-text-primary)",
                  border: "1.5px solid var(--roost-text-primary)",
                  borderBottom: "4px solid rgba(0,0,0,0.2)",
                  color: "white",
                  fontWeight: 800,
                }}
              >
                <RotateCcw className="size-4" />
                Try again
              </button>

              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "4px solid var(--roost-border-bottom)",
                  color: "var(--roost-text-primary)",
                  fontWeight: 800,
                }}
              >
                <Home className="size-4" />
                Back to home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
