"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";

// ---- Types ------------------------------------------------------------------

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  householdId: string | null;
  householdName: string | null;
  role: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
}

interface UsersResponse {
  users: AdminUser[];
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
      <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 700, minWidth: "120px" }}>
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

function UserRow({ user }: { user: AdminUser }) {
  const [expanded, setExpanded] = useState(false);
  const isPremium = user.subscriptionStatus === "premium";

  return (
    <>
      <tr
        onClick={() => setExpanded((e) => !e)}
        style={{
          cursor: "pointer",
          borderBottom: "1px solid #1E293B",
          background: expanded ? "#1E293B" : "transparent",
          transition: "background 0.1s",
        }}
      >
        {/* Name + email */}
        <td style={{ padding: "14px 16px" }}>
          <p style={{ color: "#F1F5F9", fontSize: "14px", fontWeight: 700, margin: 0 }}>
            {user.name || "(no name)"}
          </p>
          <p style={{ color: "#64748B", fontSize: "12px", fontWeight: 600, margin: "2px 0 0" }}>
            {user.email}
          </p>
        </td>

        {/* Household + role */}
        <td style={{ padding: "14px 16px" }}>
          {user.householdName ? (
            <>
              <p style={{ color: "#94A3B8", fontSize: "13px", fontWeight: 600, margin: 0 }}>
                {user.householdName}
              </p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: "4px",
                  background: user.role === "admin" ? "#6366F120" : "#33415520",
                  color: user.role === "admin" ? "#818CF8" : "#94A3B8",
                  border: `1px solid ${user.role === "admin" ? "#6366F140" : "#47556940"}`,
                  borderRadius: "6px",
                  padding: "1px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {user.role ?? "member"}
              </span>
            </>
          ) : (
            <span style={{ color: "#475569", fontSize: "12px", fontWeight: 600 }}>No household</span>
          )}
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

        {/* Joined */}
        <td style={{ padding: "14px 16px" }}>
          <p
            style={{ color: "#94A3B8", fontSize: "13px", fontWeight: 600, margin: 0 }}
            title={absDate(user.createdAt)}
          >
            {relDate(user.createdAt)}
          </p>
          <p style={{ color: "#475569", fontSize: "11px", fontWeight: 600, margin: "2px 0 0" }}>
            {absDate(user.createdAt)}
          </p>
        </td>
      </tr>

      {expanded && (
        <tr style={{ background: "#1E293B", borderBottom: "1px solid #334155" }}>
          <td colSpan={4} style={{ padding: "12px 16px 16px" }}>
            <div
              style={{
                background: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "12px 16px",
              }}
            >
              <CopyField label="User ID" value={user.id} />
              <CopyField label="Household ID" value={user.householdId} />
              <CopyField label="Stripe Customer ID" value={user.stripeCustomerId} />
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

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    (q: string, f: string, p: number) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: "50", filter: f });
      if (q) params.set("search", q);
      fetch(`/api/admin/users?${params}`)
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

  // Initial load
  useEffect(() => {
    load(search, filter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  // Debounced search
  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(val, filter, 1);
    }, 300);
  }

  function handleFilterChange(val: string) {
    setFilter(val);
    setPage(1);
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
          Users
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
          {data ? `${data.total.toLocaleString()} total users` : "Loading..."}
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search name or email..."
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
                {["User", "Household / Role", "Status", "Joined"].map((col) => (
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
                    colSpan={4}
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
              ) : !data || data.users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                data.users.map((user) => <UserRow key={user.id} user={user} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
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
