"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";

// ---- Types ------------------------------------------------------------------

interface PromoCode {
  id: string;
  code: string;
  duration_days: number;
  is_lifetime: boolean;
  status: string;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  created_at: string;
}

// ---- Helpers ----------------------------------------------------------------

function relDate(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

function absDate(iso: string) {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

function durationLabel(days: number): string {
  if (days === 180) return "6 months";
  if (days === 365) return "1 year";
  return `${days} days`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ---- Status badge -----------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; border: string }> = {
    active: { bg: "#22C55E20", color: "#22C55E", border: "#22C55E40" },
    paused: { bg: "#F59E0B20", color: "#F59E0B", border: "#F59E0B40" },
    deactivated: { bg: "#33415530", color: "#64748B", border: "#47556940" },
  };
  const c = config[status] ?? config.deactivated;
  return (
    <span
      style={{
        display: "inline-block",
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: "6px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

// ---- Promo row --------------------------------------------------------------

function PromoRow({
  promo,
  onStatusChange,
}: {
  promo: PromoCode;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isDeactivated = promo.status === "deactivated";

  async function handleAction(newStatus: string) {
    setSaving(newStatus);
    try {
      const res = await fetch(`/api/admin/promo-codes/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      onStatusChange(promo.id, newStatus);
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  }

  function handleCopy() {
    copyToClipboard(promo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const actionButtons: { label: string; status: string; color: string }[] = [];
  if (promo.status === "active") {
    actionButtons.push({ label: "Pause", status: "paused", color: "#F59E0B" });
    actionButtons.push({ label: "Deactivate", status: "deactivated", color: "#EF4444" });
  } else if (promo.status === "paused") {
    actionButtons.push({ label: "Activate", status: "active", color: "#22C55E" });
    actionButtons.push({ label: "Deactivate", status: "deactivated", color: "#EF4444" });
  } else {
    actionButtons.push({ label: "Reactivate", status: "active", color: "#22C55E" });
  }

  return (
    <tr
      style={{
        borderBottom: "1px solid #1E293B",
        opacity: isDeactivated ? 0.5 : 1,
      }}
    >
      {/* Code */}
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "14px",
              fontWeight: 700,
              color: "#F1F5F9",
              letterSpacing: "0.05em",
              textDecoration: isDeactivated ? "line-through" : "none",
            }}
          >
            {promo.code}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? "#22C55E20" : "#334155",
              border: "1px solid #475569",
              borderRadius: "4px",
              padding: "1px 6px",
              color: copied ? "#22C55E" : "#64748B",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </td>

      {/* Duration */}
      <td style={{ padding: "14px 16px", color: "#94A3B8", fontSize: "13px", fontWeight: 600 }}>
        {promo.is_lifetime ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#8B5CF620",
              color: "#A78BFA",
              border: "1px solid #8B5CF640",
              borderRadius: "6px",
              padding: "2px 10px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.67-6-2.67-6 0a4 4 0 0 0 6 4 4 4 0 0 0 6-4c0-2.67-4-2.67-6 0"/></svg>
            Lifetime
          </span>
        ) : (
          durationLabel(promo.duration_days)
        )}
      </td>

      {/* Status */}
      <td style={{ padding: "14px 16px" }}>
        <StatusBadge status={promo.status} />
      </td>

      {/* Redeemed */}
      <td style={{ padding: "14px 16px", color: "#94A3B8", fontSize: "13px", fontWeight: 600 }}>
        {promo.redemption_count} / {promo.max_redemptions ?? "\u221E"}
      </td>

      {/* Expires */}
      <td
        style={{ padding: "14px 16px", color: "#64748B", fontSize: "13px", fontWeight: 600 }}
        title={promo.expires_at ? absDate(promo.expires_at) : ""}
      >
        {promo.expires_at ? absDate(promo.expires_at) : "Never"}
      </td>

      {/* Created */}
      <td
        style={{ padding: "14px 16px", color: "#64748B", fontSize: "13px", fontWeight: 600 }}
        title={promo.created_at ? absDate(promo.created_at) : ""}
      >
        {promo.created_at ? relDate(promo.created_at) : ""}
      </td>

      {/* Actions */}
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {actionButtons.map((btn) => (
            <button
              key={btn.status}
              onClick={() => handleAction(btn.status)}
              disabled={saving !== null}
              style={{
                background: "transparent",
                border: "none",
                color: btn.color,
                fontSize: "12px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving === btn.status ? 0.5 : 1,
                padding: "4px 0",
                whiteSpace: "nowrap",
              }}
            >
              {saving === btn.status ? "..." : btn.label}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ---- Filter tabs ------------------------------------------------------------

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "deactivated", label: "Deactivated" },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
];

// ---- Page -------------------------------------------------------------------

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // Create form state
  const [formCode, setFormCode] = useState("");
  const [formLifetime, setFormLifetime] = useState(false);
  const [formDuration, setFormDuration] = useState(30);
  const [formMaxRedemptions, setFormMaxRedemptions] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/promo-codes")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        setCodes(d.codes);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    const payload: Record<string, unknown> = {};
    if (formLifetime) {
      payload.isLifetime = true;
    } else {
      payload.durationDays = formDuration;
    }
    if (formCode.trim()) payload.code = formCode.trim();
    if (formMaxRedemptions && Number(formMaxRedemptions) > 0) {
      payload.maxRedemptions = Number(formMaxRedemptions);
    }
    if (formExpiresAt) payload.expiresAt = formExpiresAt;

    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create");
        return;
      }
      // Reset form and reload
      setFormCode("");
      setFormLifetime(false);
      setFormMaxRedemptions("");
      setFormExpiresAt("");
      load();
    } catch {
      setCreateError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  function handleStatusChange(id: string, newStatus: string) {
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
  }

  const filteredCodes =
    filter === "all" ? codes : codes.filter((c) => c.status === filter);

  const inputStyle: React.CSSProperties = {
    background: "#1E293B",
    border: "1px solid #334155",
    borderBottom: "3px solid #334155",
    borderRadius: "8px",
    padding: "8px 14px",
    color: "#F1F5F9",
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: "13px",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 900,
            color: "#F1F5F9",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Promo Codes
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
          {codes.length} total code{codes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        style={{
          background: "#1E293B",
          border: "1px solid #334155",
          borderBottom: "4px solid #4338CA",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <p
          style={{
            color: "#F1F5F9",
            fontSize: "15px",
            fontWeight: 800,
            margin: "0 0 16px",
          }}
        >
          Create promo code
        </p>

        {/* Lifetime toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <button
            type="button"
            onClick={() => setFormLifetime((v) => !v)}
            style={{
              width: "40px",
              height: "22px",
              borderRadius: "11px",
              border: "none",
              background: formLifetime ? "#8B5CF6" : "#334155",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.15s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "2px",
                left: formLifetime ? "20px" : "2px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#F1F5F9",
                transition: "left 0.15s",
              }}
            />
          </button>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: formLifetime ? "#A78BFA" : "#64748B",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.67-6-2.67-6 0a4 4 0 0 0 6 4 4 4 0 0 0 6-4c0-2.67-4-2.67-6 0"/></svg>
            Lifetime premium
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          {/* Code */}
          <div>
            <label
              style={{
                display: "block",
                color: "#64748B",
                fontSize: "11px",
                fontWeight: 700,
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              CODE
            </label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="Auto-generated if empty"
              maxLength={32}
              style={{ ...inputStyle, width: "100%", fontFamily: "monospace", letterSpacing: "0.08em" }}
            />
          </div>

          {/* Duration */}
          <div style={{ opacity: formLifetime ? 0.4 : 1, pointerEvents: formLifetime ? "none" : "auto" }}>
            <label
              style={{
                display: "block",
                color: "#64748B",
                fontSize: "11px",
                fontWeight: 700,
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              DURATION
            </label>
            <select
              value={formDuration}
              onChange={(e) => setFormDuration(Number(e.target.value))}
              disabled={formLifetime}
              style={{ ...inputStyle, width: "100%", cursor: formLifetime ? "not-allowed" : "pointer" }}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max redemptions */}
          <div>
            <label
              style={{
                display: "block",
                color: "#64748B",
                fontSize: "11px",
                fontWeight: 700,
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              MAX REDEMPTIONS
            </label>
            <input
              type="number"
              value={formMaxRedemptions}
              onChange={(e) => setFormMaxRedemptions(e.target.value)}
              placeholder="0 = unlimited"
              min={0}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          {/* Expires at */}
          <div>
            <label
              style={{
                display: "block",
                color: "#64748B",
                fontSize: "11px",
                fontWeight: 700,
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              CODE EXPIRES (optional)
            </label>
            <input
              type="date"
              value={formExpiresAt}
              onChange={(e) => setFormExpiresAt(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
        </div>

        {createError && (
          <p style={{ color: "#F87171", fontSize: "13px", fontWeight: 600, margin: "0 0 12px" }}>
            {createError}
          </p>
        )}

        <button
          type="submit"
          disabled={creating}
          style={{
            background: "#6366F1",
            border: "none",
            borderBottom: "3px solid #4338CA",
            borderRadius: "8px",
            padding: "8px 20px",
            color: "white",
            fontSize: "13px",
            fontWeight: 800,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.7 : 1,
          }}
        >
          {creating ? "Creating..." : "Create promo code"}
        </button>
      </form>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "4px" }}>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              background: filter === opt.value ? "#6366F1" : "#1E293B",
              border: `1px solid ${filter === opt.value ? "#6366F1" : "#334155"}`,
              borderBottom: `3px solid ${filter === opt.value ? "#4338CA" : "#334155"}`,
              borderRadius: "8px",
              padding: "6px 14px",
              color: filter === opt.value ? "#fff" : "#94A3B8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {error ? (
        <div style={{ color: "#F87171", fontSize: "14px", fontWeight: 600 }}>{error}</div>
      ) : (
        <div
          style={{
            background: "#1E293B",
            border: "1px solid #334155",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", background: "#0F172A" }}>
                {["Code", "Duration", "Status", "Redeemed", "Expires", "Created", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        color: "#64748B",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {col.toUpperCase()}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#64748B",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    {filter === "all"
                      ? "No promo codes yet. Create one above."
                      : `No ${filter} promo codes.`}
                  </td>
                </tr>
              ) : (
                filteredCodes.map((promo) => (
                  <PromoRow
                    key={promo.id}
                    promo={promo}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
