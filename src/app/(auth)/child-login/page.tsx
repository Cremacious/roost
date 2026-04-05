"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ChildLoginPage() {
  const router = useRouter();
  const [householdCode, setHouseholdCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/child-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdCode, pin }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Sign in failed. Check your code and PIN.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="text-base text-muted-foreground">
            Enter your household code and PIN
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="householdCode" className="text-base font-medium">
              Household Code
            </label>
            <input
              id="householdCode"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              maxLength={6}
              value={householdCode}
              onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="flex h-16 w-full rounded-lg border border-input bg-background px-4 text-2xl font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pin" className="text-base font-medium">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="flex h-16 w-full rounded-lg border border-input bg-background px-4 text-2xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-16 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Adult account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
