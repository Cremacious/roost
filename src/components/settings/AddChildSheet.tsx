"use client";

import { useState } from "react";
import { Copy, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import DraggableSheet from "@/components/shared/DraggableSheet";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddChildSheet({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"form" | "pin">("form");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdName, setCreatedName] = useState("");
  const [createdPin, setCreatedPin] = useState("");
  const [copied, setCopied] = useState(false);

  function handleClose() {
    onClose();
    // Reset after close animation
    setTimeout(() => {
      setStep("form");
      setName("");
      setSaving(false);
      setCreatedName("");
      setCreatedPin("");
      setCopied(false);
    }, 300);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 32) return;
    setSaving(true);
    try {
      const r = await fetch("/api/household/members/add-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string };
        toast.error(body.error ?? "Failed to create child account.", {
          description: "Check that you have not reached your account limit.",
        });
        return;
      }
      const data = await r.json() as { child: { name: string }; pin: string };
      setCreatedName(data.child.name);
      setCreatedPin(data.pin);
      setStep("pin");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch {
      toast.error("Something went wrong.", {
        description: "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdPin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && handleClose()} featureColor="#EF4444">
      <div
        className="overflow-y-auto px-4 pb-8"
        style={{ maxHeight: "calc(92dvh - 60px)" }}
      >
        {step === "form" ? (
          <>
            <p
              className="mb-5 text-lg"
              style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
            >
              Add a child account
            </p>

            <p
              className="mb-5 text-sm"
              style={{ color: "var(--roost-text-secondary)", fontWeight: 600, lineHeight: 1.5 }}
            >
              Child accounts log in with a 4-digit PIN on the child login screen.
              No email address needed.
            </p>

            <label
              className="mb-1 block text-sm"
              style={{ color: "#374151", fontWeight: 700 }}
            >
              Child&apos;s name
            </label>
            <input
              type="text"
              maxLength={32}
              placeholder="e.g. Emma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !saving && name.trim().length > 0 && handleSubmit()}
              style={{
                width: "100%",
                height: 48,
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                borderRadius: 12,
                backgroundColor: "var(--roost-surface)",
                color: "var(--roost-text-primary)",
                fontSize: 15,
                fontWeight: 700,
                padding: "0 14px",
                outline: "none",
                boxSizing: "border-box",
                display: "block",
                marginBottom: 20,
              }}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || name.trim().length === 0}
              style={{
                width: "100%",
                height: 52,
                backgroundColor: name.trim().length === 0 ? "var(--roost-border)" : "#EF4444",
                color: name.trim().length === 0 ? "var(--roost-text-muted)" : "white",
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 14,
                border: "1.5px solid transparent",
                borderBottom: `3px solid ${name.trim().length === 0 ? "var(--roost-border-bottom)" : "#C93B3B"}`,
                cursor: name.trim().length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Create account
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <p
              className="mb-1 text-lg"
              style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
            >
              Account created!
            </p>
            <p
              className="mb-5 text-sm"
              style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
            >
              {createdName} can now log in at the child login screen.
            </p>

            <div
              className="mb-4 flex flex-col items-center rounded-2xl p-6"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "4px solid var(--roost-border-bottom)",
              }}
            >
              <p
                className="mb-1 text-xs uppercase tracking-widest"
                style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
              >
                {createdName}&apos;s PIN
              </p>
              <p
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  letterSpacing: "0.25em",
                  color: "#EF4444",
                  fontFamily: "monospace",
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                {createdPin}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: copied ? "#22C55E" : "#EF4444",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                <Copy size={14} />
                {copied ? "Copied!" : "Copy PIN"}
              </button>
            </div>

            <div
              className="mb-5 rounded-xl px-4 py-3"
              style={{
                backgroundColor: "#FFFBEB",
                border: "1px solid #F59E0B",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#92400E",
                  lineHeight: 1.5,
                }}
              >
                Save this PIN now. It won&apos;t be shown again. You can change it later in member settings.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              style={{
                width: "100%",
                height: 52,
                backgroundColor: "#EF4444",
                color: "white",
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 14,
                border: "1.5px solid #EF4444",
                borderBottom: "3px solid #C93B3B",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </DraggableSheet>
  );
}
