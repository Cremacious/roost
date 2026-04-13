"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import DraggableSheet from "@/components/shared/DraggableSheet";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddChildSheet({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"form" | "success">("form");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdName, setCreatedName] = useState("");
  const [createdPin, setCreatedPin] = useState("");
  const [copied, setCopied] = useState(false);

  const trimmedName = name.trim();
  const pinValid = /^\d{4}$/.test(pin);
  const canSubmit = trimmedName.length > 0 && pinValid && !saving;

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep("form");
      setName("");
      setPin("");
      setShowPin(false);
      setSaving(false);
      setCreatedName("");
      setCreatedPin("");
      setCopied(false);
    }, 300);
  }

  function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const r = await fetch("/api/household/members/add-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, pin }),
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
      setStep("success");
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

  const inputStyle = {
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
    boxSizing: "border-box" as const,
    display: "block",
  };

  const labelStyle = {
    color: "#374151",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
  };

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && handleClose()} featureColor="#EF4444">
      <div className="px-4 pb-8">
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

            {/* Name field */}
            <label className="mb-1 block text-sm" style={labelStyle}>
              Child&apos;s name
            </label>
            <input
              type="text"
              maxLength={32}
              placeholder="e.g. Emma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            {/* PIN field */}
            <label className="mb-1 block text-sm" style={labelStyle}>
              Choose a 4-digit PIN
            </label>
            <div style={{ position: "relative", marginBottom: 6 }}>
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
                style={{
                  ...inputStyle,
                  letterSpacing: "0.25em",
                  fontFamily: "monospace",
                  fontSize: 22,
                  fontWeight: 900,
                  paddingRight: 48,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: "var(--roost-text-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p
              className="mb-5 text-xs"
              style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
            >
              Your child will use this PIN to log in
            </p>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: "100%",
                height: 52,
                backgroundColor: canSubmit ? "#EF4444" : "var(--roost-border)",
                color: canSubmit ? "white" : "var(--roost-text-muted)",
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 14,
                border: "1.5px solid transparent",
                borderBottom: `3px solid ${canSubmit ? "#C93B3B" : "var(--roost-border-bottom)"}`,
                cursor: canSubmit ? "pointer" : "not-allowed",
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
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--roost-text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                You can change this PIN later in Settings. Click {createdName} under Members, then use the Change PIN option.
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
