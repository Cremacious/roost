"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { reportClientError } from "@/lib/observability/client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportClientError({
      source: "app.error_boundary",
      error,
      digest: error.digest,
      pathname: window.location.pathname + window.location.search,
    });
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <section
        className="w-full max-w-xl rounded-[28px] px-8 py-10 text-center"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: "6px solid #E58B2A",
        }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl"
          style={{
            backgroundColor: "#FFF3E6",
            border: "1.5px solid #F3C994",
          }}
        >
          <AlertTriangle className="size-8 text-[#C76A14]" />
        </div>

        <div className="mt-6 space-y-3">
          <p
            className="text-sm uppercase tracking-[0.24em]"
            style={{ color: "var(--roost-text-muted)", fontWeight: 800 }}
          >
            Roost hit a snag
          </p>
          <h1
            className="text-3xl sm:text-4xl"
            style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
          >
            This page ran into an unexpected error.
          </h1>
          <p
            className="mx-auto max-w-md text-sm leading-6 sm:text-base"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            Try loading this section again. If it keeps happening, head back home and we can
            keep moving from there.
          </p>
          {error.digest ? (
            <p
              className="text-xs tracking-[0.18em] uppercase"
              style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
            >
              Reference {error.digest}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
  );
}
