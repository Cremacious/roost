import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <section
        className="w-full max-w-2xl rounded-[32px] px-8 py-10 text-center"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: "8px solid #4F46E5",
        }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl"
          style={{
            backgroundColor: "rgba(79,70,229,0.12)",
            border: "1.5px solid rgba(79,70,229,0.2)",
          }}
        >
          <Compass className="size-8 text-[#4338CA]" />
        </div>

        <div className="mt-6 space-y-3">
          <p
            className="text-sm uppercase tracking-[0.24em]"
            style={{ color: "var(--roost-text-muted)", fontWeight: 800 }}
          >
            404
          </p>
          <h1
            className="text-3xl sm:text-5xl"
            style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
          >
            This corner of Roost doesn&apos;t exist.
          </h1>
          <p
            className="mx-auto max-w-xl text-sm leading-6 sm:text-base"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            The link may be old, mistyped, or pointed at a page we no longer ship. Let&apos;s get
            you back to somewhere useful.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm"
            style={{
              backgroundColor: "var(--roost-text-primary)",
              border: "1.5px solid var(--roost-text-primary)",
              borderBottom: "4px solid rgba(0,0,0,0.2)",
              color: "white",
              fontWeight: 800,
            }}
          >
            <Home className="size-4" />
            Back to home
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid var(--roost-border-bottom)",
              color: "var(--roost-text-primary)",
              fontWeight: 800,
            }}
          >
            <Search className="size-4" />
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
