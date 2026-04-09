"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { addDays, format } from "date-fns";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import DraggableSheet from "@/components/shared/DraggableSheet";
import { toast } from "sonner";

const AMBER = "#F59E0B";
const AMBER_DARK = "#D97706";
const AMBER_BG = "#FEF3C7";
const AMBER_TEXT = "#92400E";

const PRESETS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "30 days", days: 30 },
];

// ---- Types ------------------------------------------------------------------

interface GeneratedInvite {
  url: string;
  expires_at: string;
  link_expires_at: string;
}

interface InviteGuestSheetProps {
  open: boolean;
  onClose: () => void;
}

// ---- Component --------------------------------------------------------------

export default function InviteGuestSheet({ open, onClose }: InviteGuestSheetProps) {
  const [email, setEmail] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const maxDate = format(addDays(new Date(), 365), "yyyy-MM-dd");

  function computeExpiryDate(): Date {
    if (useCustomDate && customDate) {
      return new Date(customDate + "T23:59:59");
    }
    return addDays(new Date(), selectedDays);
  }

  function previewLabel(): string {
    const d = computeExpiryDate();
    return `Guest access ends ${format(d, "MMMM d, yyyy")}`;
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (email.trim()) body.email = email.trim();
      if (useCustomDate && customDate) {
        body.expires_at_custom = new Date(customDate + "T23:59:59").toISOString();
      } else {
        body.expires_in_days = selectedDays;
      }

      const r = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error("Could not generate invite", { description: data.error ?? "Please try again." });
        return;
      }
      setResult(data.invite);
    } catch {
      toast.error("Could not generate invite", { description: "Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!result || !navigator.share) return;
    await navigator.share({
      url: result.url,
      title: "Join our household on Roost",
      text: "You've been invited to join our household on Roost!",
    }).catch(() => {/* user cancelled */});
  }

  function handleReset() {
    setEmail("");
    setSelectedDays(7);
    setUseCustomDate(false);
    setCustomDate("");
    setResult(null);
    setCopied(false);
  }

  function handleClose() {
    onClose();
    // Reset after animation
    setTimeout(handleReset, 300);
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--roost-surface)",
    border: "1.5px solid #E5E7EB",
    borderBottom: "3px solid #E5E7EB",
    color: "var(--roost-text-primary)",
    fontWeight: 600,
    borderRadius: 12,
    width: "100%",
    height: 48,
    padding: "0 14px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const canGenerate = !loading && (!useCustomDate || !!customDate);

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && handleClose()} featureColor={AMBER}>
        <div
          className="overflow-y-auto px-4 pb-8"
          style={{ maxHeight: "calc(88dvh - 60px)" }}
        >
          {result ? (
            // ---- Success state -----------------------------------------------
            <div className="space-y-5">
              <div>
                <p className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                  Invite link ready!
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  Share this link with your guest.
                </p>
              </div>

              {/* Link display */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-3"
                style={{ backgroundColor: "var(--roost-bg)", border: "1.5px solid var(--roost-border)" }}
              >
                <p
                  className="flex-1 truncate font-mono text-xs"
                  style={{ color: "var(--roost-text-primary)" }}
                >
                  {result.url}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs text-white"
                  style={{
                    backgroundColor: AMBER,
                    border: `1.5px solid ${AMBER_DARK}`,
                    fontWeight: 700,
                    transition: "background 0.15s",
                  }}
                >
                  {copied ? <><Check className="size-3" /> Copied!</> : <><Copy className="size-3" /> Copy</>}
                </button>
              </div>

              {/* Share button (mobile only) */}
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
                  style={{
                    border: "1.5px solid #E5E7EB",
                    borderBottom: "3px solid #E5E7EB",
                    color: "var(--roost-text-primary)",
                    fontWeight: 700,
                  }}
                >
                  <Share2 className="size-4" />
                  Share
                </button>
              )}

              {/* Expiry info */}
              <div
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: AMBER_BG, border: `1px solid ${AMBER}` }}
              >
                <p className="text-sm" style={{ color: AMBER_TEXT, fontWeight: 700 }}>
                  This link expires in 7 days.
                </p>
                <p className="text-xs mt-1" style={{ color: AMBER_TEXT, fontWeight: 600 }}>
                  Your guest's access will end on {format(new Date(result.expires_at), "MMMM d, yyyy")}.
                </p>
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={handleReset}
                className="flex h-11 w-full items-center justify-center rounded-xl text-sm"
                style={{ color: AMBER_TEXT, fontWeight: 700 }}
              >
                Invite another guest
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 2 }}
                onClick={handleClose}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
                style={{
                  backgroundColor: AMBER,
                  border: `1.5px solid ${AMBER}`,
                  borderBottom: `3px solid ${AMBER_DARK}`,
                  fontWeight: 800,
                }}
              >
                Done
              </motion.button>
            </div>
          ) : (
            // ---- Form state -------------------------------------------------
            <div className="space-y-5">
              <div>
                <p className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                  Invite a Guest
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  They'll get temporary access that expires automatically.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                  Guest's email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  style={inputStyle}
                />
                <p className="mt-1 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  We'll pre-fill their signup form
                </p>
              </div>

              {/* Expiry */}
              <div>
                <label className="mb-2 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                  Access expires
                </label>

                {useCustomDate ? (
                  <div>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={tomorrow}
                      max={maxDate}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => { setUseCustomDate(false); setCustomDate(""); }}
                      className="mt-2 text-xs"
                      style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                    >
                      Back to presets
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p.days}
                          type="button"
                          onClick={() => setSelectedDays(p.days)}
                          className="rounded-xl px-3 py-2 text-sm"
                          style={{
                            backgroundColor: selectedDays === p.days ? AMBER_BG : "var(--roost-bg)",
                            border: `1.5px solid ${selectedDays === p.days ? AMBER : "var(--roost-border)"}`,
                            borderBottom: `3px solid ${selectedDays === p.days ? AMBER_DARK : "var(--roost-border)"}`,
                            color: selectedDays === p.days ? AMBER_TEXT : "var(--roost-text-primary)",
                            fontWeight: 700,
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseCustomDate(true)}
                      className="mt-2 text-xs"
                      style={{ color: AMBER_TEXT, fontWeight: 700 }}
                    >
                      Custom date
                    </button>
                  </div>
                )}

                {/* Live preview */}
                <p className="mt-3 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  {previewLabel()}
                </p>
              </div>

              {/* Generate button */}
              <motion.button
                type="button"
                whileTap={{ y: 2 }}
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
                style={{
                  backgroundColor: AMBER,
                  border: `1.5px solid ${AMBER}`,
                  borderBottom: `3px solid ${AMBER_DARK}`,
                  fontWeight: 800,
                  opacity: canGenerate ? 1 : 0.6,
                  cursor: canGenerate ? "pointer" : "not-allowed",
                }}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Generate Invite Link"}
              </motion.button>
            </div>
          )}
        </div>
    </DraggableSheet>
  );
}
