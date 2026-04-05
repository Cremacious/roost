"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Home, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RoostLogo from "@/components/shared/RoostLogo";

type Choice = "create" | "join";

interface CreatedHousehold { id: string; name: string; code: string }
interface JoinedHousehold  { id: string; name: string }

const inputClass =
  "flex h-12 w-full rounded-xl border bg-transparent px-4 text-sm placeholder:italic focus:outline-none transition-colors";
const inputStyle = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedHousehold | null>(null);
  const [joined, setJoined] = useState<JoinedHousehold | null>(null);

  function selectChoice(c: Choice) { setChoice(c); setStep(2); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!householdName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/household/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: householdName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Failed to create household"); setLoading(false); return; }
    setCreated(data.household as CreatedHousehold);
    setStep(3);
    setLoading(false);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    const res = await fetch("/api/household/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Failed to join household"); setLoading(false); return; }
    setJoined(data.household as JoinedHousehold);
    setStep(3);
    setLoading(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full max-w-md space-y-8"
      >
        {/* Logo */}
        <div className="flex justify-center">
          <RoostLogo size="xl" variant="dark" />
        </div>

        {/* Step indicator: slab pill segments */}
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className="h-2 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: s <= step ? "var(--roost-text-primary)" : "var(--roost-border)",
                borderBottom: s <= step ? "2px solid rgba(0,0,0,0.15)" : "2px solid transparent",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Choose */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                  Welcome to Roost.
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  Let&apos;s get your household set up.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    choice: "create" as Choice,
                    icon: Home,
                    title: "Create a household",
                    desc: "Start fresh and invite your family or roommates.",
                  },
                  {
                    choice: "join" as Choice,
                    icon: Users,
                    title: "Join a household",
                    desc: "Enter a code to join an existing household.",
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <motion.button
                      key={opt.choice}
                      type="button"
                      onClick={() => selectChoice(opt.choice)}
                      whileTap={{ y: 2 }}
                      className="flex w-full items-start gap-4 rounded-2xl p-5 text-left"
                      style={{
                        backgroundColor: "var(--roost-surface)",
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: "4px solid var(--roost-border-bottom)",
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: "var(--roost-border)",
                          border: "1.5px solid var(--roost-border)",
                          borderBottom: "3px solid var(--roost-border-bottom)",
                        }}
                      >
                        <Icon className="size-5" style={{ color: "var(--roost-text-primary)" }} />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                          {opt.title}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                          {opt.desc}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2A: Create */}
          {step === 2 && choice === "create" && (
            <motion.div
              key="step2a"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                  Name your household.
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  This is what your members will see.
                </p>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                    Household name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. The Johnson House"
                    autoFocus
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading || !householdName.trim()}
                  whileTap={{ y: 2 }}
                  className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--roost-text-primary)",
                    border: "1.5px solid var(--roost-text-primary)",
                    borderBottom: "3px solid rgba(0,0,0,0.25)",
                    fontWeight: 800,
                  }}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Create household"}
                </motion.button>
              </form>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm underline underline-offset-4"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 2B: Join */}
          {step === 2 && choice === "join" && (
            <motion.div
              key="step2b"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                  Join a household.
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  Ask your household admin for the 6-character code.
                </p>
              </div>
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                    Household code
                  </label>
                  <input
                    type="text"
                    placeholder="6-letter code from your housemate"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={6}
                    autoFocus
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="flex h-12 w-full rounded-xl border bg-transparent px-4 text-center font-mono text-xl tracking-widest placeholder:text-sm placeholder:not-italic placeholder:tracking-normal focus:outline-none"
                    style={inputStyle}
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading || joinCode.length < 6}
                  whileTap={{ y: 2 }}
                  className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--roost-text-primary)",
                    border: "1.5px solid var(--roost-text-primary)",
                    borderBottom: "3px solid rgba(0,0,0,0.25)",
                    fontWeight: 800,
                  }}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Join household"}
                </motion.button>
              </form>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm underline underline-offset-4"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "#22C55E18", border: "1.5px solid #22C55E30", borderBottom: "3px solid #22C55E40" }}
                >
                  <Check className="size-5" style={{ color: "#22C55E" }} />
                </div>
                <div>
                  <h1 className="text-2xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                    You&apos;re all set.
                  </h1>
                  {created && (
                    <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                      <span style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>{created.name}</span> is ready to go.
                    </p>
                  )}
                  {joined && (
                    <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                      You joined <span style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>{joined.name}</span>.
                    </p>
                  )}
                </div>
              </div>

              {created && (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    Share this code to invite people:
                  </p>
                  <div
                    className="flex items-center gap-3 rounded-2xl px-5 py-4"
                    style={{
                      backgroundColor: "var(--roost-surface)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "4px solid var(--roost-border-bottom)",
                    }}
                  >
                    <span
                      className="flex-1 font-mono text-3xl tracking-widest"
                      style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
                    >
                      {created.code}
                    </span>
                    <motion.button
                      type="button"
                      onClick={() => copyCode(created.code)}
                      whileTap={{ y: 1 }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: "var(--roost-bg)",
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: "3px solid var(--roost-border-bottom)",
                        color: "var(--roost-text-secondary)",
                      }}
                      aria-label="Copy code"
                    >
                      <Copy className="size-4" />
                    </motion.button>
                  </div>
                </div>
              )}

              {joined && (
                <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  You can now see shared chores, grocery lists, and more with your household.
                </p>
              )}

              <motion.button
                type="button"
                onClick={() => router.push("/dashboard")}
                whileTap={{ y: 2 }}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
                style={{
                  backgroundColor: "var(--roost-text-primary)",
                  border: "1.5px solid var(--roost-text-primary)",
                  borderBottom: "3px solid rgba(0,0,0,0.25)",
                  fontWeight: 800,
                }}
              >
                Go to dashboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
