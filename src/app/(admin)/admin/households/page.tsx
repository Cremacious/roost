"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";

// ---- Types ------------------------------------------------------------------

interface AdminHousehold {
  id: string;
  name: string;
  code: string;
  subscriptionStatus: string;
  memberCount: number;
  createdAt: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  premiumExpiresAt: string | null;
  subscriptionUpgradedAt: string | null;
  memberEmails: string[];
}

interface HouseholdsResponse {
  households: AdminHousehold[];
  total: number;
  page: number;
  totalPages: number;
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

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ---- Sub-components ---------------------------------------------------------

function CopyField({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  function handleCopy() {
    copyToClipboard(value!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
      <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 700, minWidth: "160px" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#94A3B8",
          background: "#0F172A",
          padding: "2px 8px",
          borderRadius: "6px",
          border: "1px solid #334155",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <button
        onClick={handleCopy}
        style={{
          background: copied ? "#22C55E20" : "#334155",
          border: "1px solid #475569",
          borderRadius: "6px",
          padding: "2px 10px",
          color: copied ? "#22C55E" : "#94A3B8",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function ConfirmDialog({
  householdName,
  targetStatus,
  onConfirm,
  onCancel,
  loading,
}: {
  householdName: string;
  targetStatus: "premium" | "free";
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const isPremium = targetStatus === "premium";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#1E293B",
          border: "1px solid #334155",
          borderBottom: `4px solid ${isPremium ? "#22C55E" : "#EF4444"}`,
          borderRadius: "16px",
          padding: "28px 28px 24px",
          maxWidth: "400px",
          width: "100%",
          margin: "0 16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          style={{
            color: "#F1F5F9",
            fontSize: "17px",
            fontWeight: 900,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          {isPremium ? "Set household to Premium?" : "Set household to Free?"}
        </p>
        <p style={{ color: "#94A3B8", fontSize: "13px", fontWeight: 600, margin: "0 0 20px" }}>
          <strong style={{ color: "#F1F5F9" }}>{householdName}</strong> will{" "}
          {isPremium
            ? "immediately gain access to all premium features."
            : "lose premium features immediately. This cannot be undone without Stripe."}
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              background: "transparent",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "8px 18px",
              color: "#94A3B8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: isPremium ? "#22C55E" : "#EF4444",
              border: "none",
              borderBottom: `3px solid ${isPremium ? "#16A34A" : "#C93B3B"}`,
              borderRadius: "8px",
              padding: "8px 18px",
              color: "white",
              fontSize: "13px",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Saving..." : isPremium ? "Set Premium" : "Set Free"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HouseholdRow({
  household,
  onStatusChange,
}: {
  household: AdminHousehold;
  onStatusChange: (id: string, status: "premium" | "free") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<"premium" | "free" | null>(null);
  const [saving, setSaving] = useState(false);
  const isPremium = household.subscriptionStatus === "premium";

  function handleActionClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmTarget(isPremium ? "free" : "premium");
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/households/${household.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_status: confirmTarget }),
      });
      if (!res.ok) throw new Error("Failed");
      onStatusChange(household.id, confirmTarget);
      setConfirmTarget(null);
    } catch {
      // keep dialog open on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {confirmTarget && (
        <ConfirmDialog
          householdName={household.name}
          targetStatus={confirmTarget}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
          loading={saving}
        />
      )}

      <tr
        onClick={() => setExpanded((e) => !e)}
        style={{
          cursor: "pointer",
          borderBottom: "1px solid #1E293B",
          background: expanded ? "#1E293B" : "transparent",
          transition: "background 0.1s",
        }}
      >
        {/* Name + code */}
        <td style={{ padding: "14px 16px" }}>
          <p style={{ color: "#F1F5F9", fontSize: "14px", fontWeight: 700, margin: 0 }}>
            {household.name}
          </p>
          <p
            style={{
              color: "#64748B",
              fontSize: "11px",
              fontWeight: 700,
              margin: "2px 0 0",
              fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}
          >
            {household.code}
          </p>
        </td>

        {/* Members */}
        <td style={{ padding: "14px 16px" }}>
          <span
            style={{
              display: "inline-block",
              background: "#33415530",
              color: "#94A3B8",
              border: "1px solid #47556940",
              borderRadius: "6px",
              padding: "2px 10px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {household.memberCount}
          </span>
        </td>

        {/* Status */}
        <td style={{ padding: "14px 16px" }}>
          <span
            style={{
              display: "inline-block",
              background: isPremium ? "#22C55E20" : "#33415530",
              color: isPremium ? "#22C55E" : "#64748B",
              border: `1px solid ${isPremium ? "#22C55E40" : "#47556940"}`,
              borderRadius: "6px",
              padding: "2px 10px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {isPremium ? "Premium" : "Free"}
          </span>
        </td>

        {/* Created */}
        <td style={{ padding: "14px 16px" }}>
          <p
            style={{ color: "#94A3B8", fontSize: "13px", fontWeight: 600, margin: 0 }}
            title={absDate(household.createdAt)}
          >
            {relDate(household.createdAt)}
          </p>
        </td>

        {/* Action */}
        <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleActionClick}
            style={{
              background: isPremium ? "#EF444420" : "#22C55E20",
              border: `1px solid ${isPremium ? "#EF444440" : "#22C55E40"}`,
              borderBottom: `3px solid ${isPremium ? "#C93B3B" : "#16A34A"}`,
              borderRadius: "8px",
              padding: "5px 12px",
              color: isPremium ? "#F87171" : "#22C55E",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isPremium ? "Set Free" : "Set Premium"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr style={{ background: "#1E293B", borderBottom: "1px solid #334155" }}>
          <td colSpan={5} style={{ padding: "12px 16px 16px" }}>
            <div
              style={{
                background: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "12px 16px",
              }}
            >
              <CopyField label="Household ID" value={household.id} />
              <CopyField label="Stripe Customer ID" value={household.stripeCustomerId} />
              <CopyField label="Stripe Subscription ID" value={household.stripeSubscriptionId} />
              {household.premiumExpiresAt && (
                <div style={{ marginTop: "6px" }}>
                  <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 700 }}>
                    EXPIRES AT
                  </span>{" "}
                  <span style={{ color: "#F87171", fontSize: "12px", fontWeight: 700 }}>
                    {absDate(household.premiumExpiresAt)}
                  </span>
                </div>
              )}
              {household.subscriptionUpgradedAt && (
                <div style={{ marginTop: "6px" }}>
                  <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 700 }}>
                    FIRST UPGRADED
                  </span>{" "}
                  <span style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 700 }}>
                    {absDate(household.subscriptionUpgradedAt)}
                  </span>
                </div>
              )}
              {household.memberEmails.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <p
                    style={{
                      color: "#64748B",
                      fontSize: "11px",
                      fontWeight: 700,
                      margin: "0 0 6px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    MEMBERS
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {household.memberEmails.map((email) => (
                      <span
                        key={email}
                        style={{
                          background: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          padding: "2px 10px",
                          color: "#94A3B8",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---- Page -------------------------------------------------------------------

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "premium", label: "Premium" },
  { value: "free", label: "Free" },
];

const LS_KEY = "admin-hide-test-accounts";

export default function AdminHouseholdsPage() {
  const [data, setData] = useState<HouseholdsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hideTest, setHideTest] = useState(true);
  const [mounted, setMounted] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted preference
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored !== null) setHideTest(stored !== "false");
    setMounted(true);
  }, []);

  const load = useCallback(
    (q: string, f: string, p: number, ht: boolean) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: "50", filter: f, hideTest: String(ht) });
      if (q) params.set("search", q);
      fetch(`/api/admin/households?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        })
        .then((d) => {
          setData(d);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    if (!mounted) return;
    load(search, filter, page, hideTest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, hideTest, mounted]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(val, filter, 1, hideTest);
    }, 300);
  }

  function handleFilterChange(val: string) {
    setFilter(val);
    setPage(1);
  }

  function toggleHideTest() {
    setHideTest((prev) => {
      const next = !prev;
      localStorage.setItem(LS_KEY, String(next));
      return next;
    });
    setPage(1);
  }

  // Optimistic status update
  function handleStatusChange(id: string, newStatus: "premium" | "free") {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        households: prev.households.map((h) =>
          h.id === id ? { ...h, subscriptionStatus: newStatus } : h
        ),
      };
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "8px 14px",
    color: "#F1F5F9",
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: "13px",
    outline: "none",
    width: "260px",
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
          Households
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
          {data ? `${data.total.toLocaleString()} total households` : "Loading..."}
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search household name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={inputStyle}
        />
        <div style={{ display: "flex", gap: "4px" }}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
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
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={toggleHideTest}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#1E293B",
              border: `1px solid ${hideTest ? "#22C55E" : "#475569"}`,
              borderRadius: "20px",
              padding: "4px 12px",
              cursor: "pointer",
              color: hideTest ? "#22C55E" : "#94A3B8",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {hideTest ? (
              <EyeOff size={14} color="#22C55E" />
            ) : (
              <Eye size={14} color="#94A3B8" />
            )}
            {hideTest ? "Hiding test accounts" : "Showing test accounts"}
          </button>
        </div>
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
                {["Household", "Members", "Status", "Created", "Action"].map((col) => (
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
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
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
              ) : !data || data.households.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    No households found.
                  </td>
                </tr>
              ) : (
                data.households.map((h) => (
                  <HouseholdRow
                    key={h.id}
                    household={h}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div
          style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: "#1E293B",
              border: "1px solid #334155",
              borderBottom: "3px solid #334155",
              borderRadius: "8px",
              padding: "6px 16px",
              color: page === 1 ? "#475569" : "#94A3B8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span style={{ color: "#64748B", fontSize: "13px", fontWeight: 600 }}>
            Page {page} of {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            style={{
              background: "#1E293B",
              border: "1px solid #334155",
              borderBottom: "3px solid #334155",
              borderRadius: "8px",
              padding: "6px 16px",
              color: page === data.totalPages ? "#475569" : "#94A3B8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: page === data.totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
