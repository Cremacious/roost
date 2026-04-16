"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import DraggableSheet from "@/components/shared/DraggableSheet";
import { toast } from "sonner";

const RED = "#EF4444";
const RED_DARK = "#C93B3B";
const RED_SOFT = "#FEE2E2";
const RED_TEXT = "#991B1B";

interface GeneratedInvite {
  url: string;
  type: "member";
  link_expires_at: string;
  email: string | null;
}

interface InviteMemberSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function InviteMemberSheet({
  open,
  onClose,
}: InviteMemberSheetProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const response = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "member",
          email: email.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error("Could not generate invite", {
          description: data.error ?? "Please try again.",
        });
        return;
      }

      setResult(data.invite);
    } catch {
      toast.error("Could not generate invite", {
        description: "Check your connection and try again.",
      });
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

    await navigator
      .share({
        url: result.url,
        title: "Join our household on Roost",
        text: "You've been invited to join our household on Roost!",
      })
      .catch(() => {});
  }

  function handleReset() {
    setEmail("");
    setResult(null);
    setCopied(false);
  }

  function handleClose() {
    onClose();
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
    boxSizing: "border-box",
  };

  return (
    <DraggableSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      featureColor={RED}
    >
      <div className="px-4 pb-8" style={{ maxHeight: "calc(88dvh - 60px)" }}>
        {result ? (
          <div className="space-y-5">
            <div>
              <p
                className="text-xl"
                style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
              >
                Invite link ready!
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
              >
                Share this with the person you want to add to your household.
              </p>
            </div>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-3"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
              }}
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
                  backgroundColor: RED,
                  border: `1.5px solid ${RED_DARK}`,
                  fontWeight: 700,
                }}
              >
                {copied ? (
                  <>
                    <Check className="size-3" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy
                  </>
                )}
              </button>
            </div>

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

            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: RED_SOFT, border: `1px solid ${RED}` }}
            >
              <p className="text-sm" style={{ color: RED_TEXT, fontWeight: 700 }}>
                The link expires in 7 days.
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: RED_TEXT, fontWeight: 600 }}
              >
                After signup or login, they&apos;ll land directly in your
                household.
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="flex h-11 w-full items-center justify-center rounded-xl text-sm"
              style={{ color: RED_TEXT, fontWeight: 700 }}
            >
              Create another invite
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={handleClose}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: RED,
                border: `1.5px solid ${RED}`,
                borderBottom: `3px solid ${RED_DARK}`,
                fontWeight: 800,
              }}
            >
              Done
            </motion.button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p
                className="text-xl"
                style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
              >
                Invite to household
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
              >
                Create a link that lets someone join this household with a full
                member account.
              </p>
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs"
                style={{ color: "#374151", fontWeight: 700 }}
              >
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="friend@example.com"
                style={inputStyle}
              />
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                This helps you keep track of who the link is for, but it isn&apos;t
                required.
              </p>
            </div>

            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={handleGenerate}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
              style={{
                backgroundColor: RED,
                border: `1.5px solid ${RED}`,
                borderBottom: `3px solid ${RED_DARK}`,
                fontWeight: 800,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Generate Invite Link"
              )}
            </motion.button>
          </div>
        )}
      </div>
    </DraggableSheet>
  );
}
