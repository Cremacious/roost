"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Clock, Loader2 } from "lucide-react";
import { format, isToday } from "date-fns";
import { useSession } from "@/lib/auth/client";
import RoostLogo from "@/components/shared/RoostLogo";

const AMBER = "#F59E0B";
const AMBER_DARK = "#D97706";
const AMBER_BG = "#FEF3C7";
const AMBER_TEXT = "#92400E";
const GREEN = "#22C55E";
const GREEN_DARK = "#159040";

// ---- Types ------------------------------------------------------------------

interface InviteInfo {
  valid: true;
  household_name: string;
  expires_at: string;
  email: string | null;
}

type InviteState =
  | { status: "loading" }
  | { status: "valid"; info: InviteInfo }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "error" };

// ---- Helpers ----------------------------------------------------------------

function formatExpiryDate(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "MMM d, yyyy");
}

function formatRelativeExpiry(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  if (isToday(date)) return "expires today";
  const days = Math.max(1, Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  if (days <= 3) return `expires in ${days} day${days === 1 ? "" : "s"}`;
  return `expires ${format(date, "MMM d")}`;
}

// ---- Page -------------------------------------------------------------------

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { data: sessionData, isPending: sessionLoading } = useSession();
  const isLoggedIn = !!sessionData?.user;

  const [inviteState, setInviteState] = useState<InviteState>({ status: "loading" });
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then(async (r) => {
        if (r.status === 404) { setInviteState({ status: "not_found" }); return; }
        if (r.status === 410) { setInviteState({ status: "expired" }); return; }
        if (!r.ok) { setInviteState({ status: "error" }); return; }
        const data = await r.json();
        setInviteState({ status: "valid", info: data });
      })
      .catch(() => setInviteState({ status: "error" }));
  }, [token]);

  async function handleJoin() {
    setJoining(true);
    try {
      const r = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (r.status === 409) {
        // Already a member — just go to dashboard
        router.push("/dashboard");
        return;
      }
      if (!r.ok) {
        alert(data.error ?? "Something went wrong. Please try again.");
        setJoining(false);
        return;
      }
      setJoined(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      alert("Could not join. Please try again.");
      setJoining(false);
    }
  }

  // ---- Loading ---------------------------------------------------------------

  if (inviteState.status === "loading" || sessionLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin" style={{ color: AMBER }} />
        </div>
      </PageShell>
    );
  }

  // ---- Error states ----------------------------------------------------------

  if (inviteState.status === "not_found") {
    return (
      <PageShell>
        <ErrorCard
          title="This invite link isn't valid."
          body="It may have already been used or the link is incorrect."
        />
      </PageShell>
    );
  }

  if (inviteState.status === "expired") {
    return (
      <PageShell>
        <ErrorCard
          title="This invite link has expired."
          body="Ask the household admin to send a new invite."
        />
      </PageShell>
    );
  }

  if (inviteState.status === "error") {
    return (
      <PageShell>
        <ErrorCard
          title="Something went wrong."
          body="We couldn't load this invite. Try again later."
        />
      </PageShell>
    );
  }

  // ---- Valid invite ----------------------------------------------------------

  const { info } = inviteState;
  const expiryLabel = formatRelativeExpiry(info.expires_at);
  const expiryFull = formatExpiryDate(info.expires_at);

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          backgroundColor: "white",
          border: "1.5px solid #E5E7EB",
          borderBottom: `4px solid ${AMBER_DARK}`,
          borderRadius: 20,
          padding: 28,
          width: "100%",
        }}
      >
        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 4 }}>
          You've been invited!
        </h1>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 20 }}>
          Join <strong>{info.household_name}</strong> on Roost
        </p>

        {/* Guest badge */}
        <div
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 mb-5"
          style={{
            backgroundColor: AMBER_BG,
            border: `1px solid ${AMBER}`,
            borderBottom: `2px solid ${AMBER_DARK}`,
          }}
        >
          <Clock className="size-3.5" style={{ color: AMBER_TEXT }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: AMBER_TEXT }}>
            Guest access · {expiryLabel}
          </span>
        </div>

        {/* What guests can do */}
        <div className="mb-6">
          <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
            What you can do as a guest:
          </p>
          <div className="flex flex-col gap-2">
            {[
              "View and add to the grocery list",
              "View and add expenses",
              "View the calendar and add events",
              "Add and complete tasks",
              "Suggest meals",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="size-4 shrink-0" style={{ color: GREEN }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Join buttons */}
        {isLoggedIn ? (
          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={handleJoin}
            disabled={joining || joined}
            style={{
              width: "100%",
              height: 50,
              backgroundColor: joined ? "#22C55E" : GREEN,
              color: "white",
              fontWeight: 800,
              fontSize: 15,
              borderRadius: 14,
              border: `1.5px solid ${joined ? "#159040" : GREEN}`,
              borderBottom: `3px solid ${joined ? "#0F7030" : GREEN_DARK}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: joining || joined ? "default" : "pointer",
              opacity: joining ? 0.8 : 1,
              transition: "background-color 0.15s",
            }}
          >
            {joined ? (
              <><Check className="size-4" /> Joined! Redirecting...</>
            ) : joining ? (
              <><Loader2 className="size-4 animate-spin" /> Joining...</>
            ) : (
              `Join as ${sessionData.user.name}`
            )}
          </motion.button>
        ) : (
          <div className="flex flex-col gap-3">
            <motion.a
              whileTap={{ y: 2 }}
              href={`/signup?invite=${token}`}
              style={{
                width: "100%",
                height: 50,
                backgroundColor: GREEN,
                color: "white",
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 14,
                border: `1.5px solid ${GREEN}`,
                borderBottom: `3px solid ${GREEN_DARK}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              Sign up to join
            </motion.a>
            <a
              href={`/login?invite=${token}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                fontSize: 14,
                fontWeight: 700,
                color: "#374151",
                textDecoration: "none",
              }}
            >
              Log in to join
            </a>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <p className="mt-5 text-center text-sm" style={{ color: "#6B7280", fontWeight: 600 }}>
        Guest access expires {expiryFull}. After that, your account remains but you'll lose access to this household.
      </p>
    </PageShell>
  );
}

// ---- Sub-components ---------------------------------------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F9FAFB",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "var(--font-nunito)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="flex justify-center mb-8">
          <RoostLogo size="md" showWordmark={true} variant="dark" />
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        backgroundColor: "white",
        border: "1.5px solid #E5E7EB",
        borderBottom: "4px solid #D1D5DB",
        borderRadius: 20,
        padding: 28,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 18, fontWeight: 900, color: "#111827", marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 24 }}>{body}</p>
      <a
        href="/"
        style={{
          display: "inline-flex",
          height: 44,
          padding: "0 24px",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EF4444",
          color: "white",
          fontWeight: 800,
          fontSize: 14,
          borderRadius: 12,
          border: "1.5px solid #C93B3B",
          borderBottom: "3px solid #C93B3B",
          textDecoration: "none",
        }}
      >
        Go to Roost
      </a>
    </motion.div>
  );
}
