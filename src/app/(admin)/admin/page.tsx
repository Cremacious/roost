"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

// ---- Types ------------------------------------------------------------------

interface StatsResponse {
  overview: {
    totalUsers: number;
    totalHouseholds: number;
    premiumHouseholds: number;
    freeHouseholds: number;
    activeHouseholdsLast30Days: number;
    newUsersThisWeek: number;
    conversionRate: number;
  };
  signupsOverTime: { date: string; count: number }[];
  conversionsOverTime: { date: string; count: number }[];
}

// ---- Stat card --------------------------------------------------------------

function StatCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "#1E293B",
        border: "1px solid #334155",
        borderBottom: `4px solid ${accent}`,
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <p style={{ color: "#64748B", fontSize: "12px", fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </p>
      <p
        style={{
          color: "#F1F5F9",
          fontSize: "32px",
          fontWeight: 900,
          margin: "6px 0 0",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p style={{ color: "#64748B", fontSize: "12px", fontWeight: 600, margin: "4px 0 0" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ---- Chart wrapper ----------------------------------------------------------

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#1E293B",
        border: "1px solid #334155",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <p
        style={{
          color: "#94A3B8",
          fontSize: "13px",
          fontWeight: 700,
          margin: "0 0 20px",
          letterSpacing: "0.03em",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = {
  background: "#1E293B",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#F1F5F9",
  fontWeight: 700,
  fontSize: "13px",
};

// ---- Hide-test toggle -------------------------------------------------------

function HideTestToggle({
  hideTest,
  onToggle,
}: {
  hideTest: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
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
  );
}

// ---- Page -------------------------------------------------------------------

const LS_KEY = "admin-hide-test-accounts";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hideTest, setHideTest] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load persisted preference
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored !== null) setHideTest(stored !== "false");
    setMounted(true);
  }, []);

  // Fetch stats whenever hideTest changes (after mount)
  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    setError("");
    fetch(`/api/admin/stats?hideTest=${hideTest}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [hideTest, mounted]);

  function toggleHideTest() {
    setHideTest((prev) => {
      const next = !prev;
      localStorage.setItem(LS_KEY, String(next));
      return next;
    });
  }

  if (!mounted || loading) {
    return (
      <div style={{ color: "#64748B", fontSize: "14px", fontWeight: 600 }}>
        Loading stats...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ color: "#F87171", fontSize: "14px", fontWeight: 600 }}>
        {error || "Failed to load stats"}
      </div>
    );
  }

  const { overview, signupsOverTime, conversionsOverTime } = stats;

  function fmtDate(d: string) {
    try {
      return format(parseISO(d), "MMM d");
    } catch {
      return d;
    }
  }

  const signupData = signupsOverTime.map((d) => ({ ...d, date: fmtDate(d.date) }));
  const conversionData = conversionsOverTime.map((d) => ({ ...d, date: fmtDate(d.date) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#F1F5F9", margin: 0, letterSpacing: "-0.02em" }}>
            Overview
          </h1>
          <p style={{ color: "#64748B", fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
            Real-time metrics across all households
          </p>
        </div>
        <HideTestToggle hideTest={hideTest} onToggle={toggleHideTest} />
      </div>

      {/* Test accounts banner */}
      <div
        style={{
          background: "#1E293B",
          border: `1px solid ${hideTest ? "#334155" : "#F59E0B"}`,
          borderRadius: "8px",
          padding: "8px 16px",
          marginTop: "-8px",
          fontSize: "12px",
          color: hideTest ? "#64748B" : "#F59E0B",
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        {hideTest
          ? "Test accounts excluded from all metrics. Toggle above to include them."
          : "Test accounts are included in metrics."}
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard label="Total Users" value={overview.totalUsers} accent="#6366F1" />
        <StatCard label="Total Households" value={overview.totalHouseholds} accent="#3B82F6" />
        <StatCard
          label="Premium"
          value={overview.premiumHouseholds}
          subtitle={`${overview.conversionRate}% conversion`}
          accent="#22C55E"
        />
        <StatCard label="Free" value={overview.freeHouseholds} accent="#475569" />
        <StatCard
          label="Active (30d)"
          value={overview.activeHouseholdsLast30Days}
          accent="#F59E0B"
        />
        <StatCard label="New This Week" value={overview.newUsersThisWeek} accent="#EC4899" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <ChartCard title="NEW SIGNUPS — LAST 90 DAYS">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={signupData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#6366F1", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#signupFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="PREMIUM CONVERSIONS — LAST 90 DAYS">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={conversionData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="conversionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#22C55E", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#conversionFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
