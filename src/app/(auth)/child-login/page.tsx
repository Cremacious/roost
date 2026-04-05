"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Delete, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIN_PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

export default function ChildLoginPage() {
  const router = useRouter();
  const [householdCode, setHouseholdCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePinPress(key: string) {
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((p) => p + key);
    }
  }

  async function handleSubmit() {
    if (!householdCode.trim() || pin.length < 4) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/child-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdCode, pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Check your code and PIN and try again.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const canSubmit = householdCode.trim().length === 6 && pin.length >= 4;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Heading */}
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl text-white"
            style={{
              backgroundColor: "var(--roost-text-primary)",
              fontWeight: 900,
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid var(--roost-border-bottom)",
            }}
          >
            R
          </div>
          <h1
            className="text-3xl"
            style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
          >
            Hey! Enter your code.
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            Ask a grown-up for the household code.
          </p>
        </div>

        {/* Household code input */}
        <div className="space-y-2">
          <label
            className="text-sm"
            style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
          >
            Household code
          </label>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={6}
            value={householdCode}
            onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
            placeholder="6-letter code from your housemate"
            className="flex h-14 w-full rounded-xl bg-transparent px-4 font-mono text-2xl tracking-[0.3em] text-center placeholder:text-base placeholder:not-italic placeholder:tracking-normal focus:outline-none"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
              color: "var(--roost-text-primary)",
              fontWeight: 700,
            }}
          />
        </div>

        {/* PIN display dots */}
        <div className="space-y-3">
          <label
            className="text-sm"
            style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
          >
            PIN
          </label>
          <div className="flex justify-center gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ scale: pin.length === i + 1 ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.15 }}
                className="h-4 w-4 rounded-full"
                style={{
                  backgroundColor:
                    i < pin.length
                      ? "var(--roost-text-primary)"
                      : "var(--roost-border)",
                  border: "2px solid var(--roost-border-bottom)",
                }}
              />
            ))}
          </div>
        </div>

        {/* PIN pad */}
        <div className="space-y-2">
          {PIN_PAD.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 gap-2">
              {row.map((key, ki) => {
                if (!key) {
                  return <div key={ki} />;
                }
                return (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => handlePinPress(key)}
                    whileTap={{ y: 2, scale: 0.97 }}
                    className="flex h-16 items-center justify-center rounded-2xl text-xl"
                    style={{
                      backgroundColor: "var(--roost-surface)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "4px solid var(--roost-border-bottom)",
                      color: "var(--roost-text-primary)",
                      fontWeight: key === "del" ? 700 : 800,
                    }}
                  >
                    {key === "del" ? (
                      <Delete className="size-5" />
                    ) : (
                      key
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <AnimatePresence>
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
            >
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                whileTap={{ y: 2 }}
                className="flex h-14 w-full items-center justify-center rounded-xl text-base text-white disabled:opacity-60"
                style={{
                  backgroundColor: "var(--roost-text-primary)",
                  border: "1.5px solid var(--roost-text-primary)",
                  borderBottom: "3px solid rgba(0,0,0,0.25)",
                  fontWeight: 800,
                }}
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : "Sign in"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
          Adult account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4"
            style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
          >
            Sign in here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
