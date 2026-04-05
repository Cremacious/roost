"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Home, Loader2, Users } from "lucide-react";

type Choice = "create" | "join";

interface CreatedHousehold {
  id: string;
  name: string;
  code: string;
}

interface JoinedHousehold {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedHousehold | null>(null);
  const [joined, setJoined] = useState<JoinedHousehold | null>(null);

  function selectChoice(c: Choice) {
    setChoice(c);
    setStep(2);
  }

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

    if (!res.ok) {
      toast.error(data.error ?? "Failed to create household");
      setLoading(false);
      return;
    }

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

    if (!res.ok) {
      toast.error(data.error ?? "Failed to join household");
      setLoading(false);
      return;
    }

    setJoined(data.household as JoinedHousehold);
    setStep(3);
    setLoading(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Choose */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome to Roost</h1>
              <p className="text-muted-foreground">Let's get your household set up</p>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => selectChoice("create")}
                className="flex items-start gap-4 rounded-xl border border-border p-5 text-left hover:bg-accent transition-colors"
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2.5">
                  <Home className="size-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold">Create a household</p>
                  <p className="text-sm text-muted-foreground">
                    Start fresh and invite your family or roommates
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectChoice("join")}
                className="flex items-start gap-4 rounded-xl border border-border p-5 text-left hover:bg-accent transition-colors"
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2.5">
                  <Users className="size-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold">Join a household</p>
                  <p className="text-sm text-muted-foreground">
                    Enter a code to join an existing household
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2A — Create */}
        {step === 2 && choice === "create" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Name your household</h1>
              <p className="text-muted-foreground">This is what your members will see</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="householdName" className="text-base font-medium">
                  Household name
                </label>
                <input
                  id="householdName"
                  type="text"
                  placeholder="The Johnson House"
                  autoFocus
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !householdName.trim()}
                className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Create household"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 2B — Join */}
        {step === 2 && choice === "join" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Join a household</h1>
              <p className="text-muted-foreground">Ask your household admin for the 6-character code</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="joinCode" className="text-base font-medium">
                  Household code
                </label>
                <input
                  id="joinCode"
                  type="text"
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={6}
                  autoFocus
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xl tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                type="submit"
                disabled={loading || joinCode.length < 6}
                className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Join household"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">You're all set</h1>
              {created && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{created.name}</span> is ready to go
                </p>
              )}
              {joined && (
                <p className="text-muted-foreground">
                  You joined <span className="font-medium text-foreground">{joined.name}</span>
                </p>
              )}
            </div>

            {created && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Share this code to invite people
                </p>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-5 py-4">
                  <span className="flex-1 font-mono text-3xl font-bold tracking-widest">
                    {created.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(created.code)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy code"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {joined && (
              <p className="text-sm text-muted-foreground">
                You can now see shared chores, grocery lists, and more with your household.
              </p>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Go to dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
