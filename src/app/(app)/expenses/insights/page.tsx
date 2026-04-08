"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart2, Calendar } from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import PremiumGate from "@/components/shared/PremiumGate";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { CategoryIcon } from "@/components/expenses/CategoryPicker";

const COLOR = "#22C55E";
const COLOR_DARK = "#16A34A";

type QuickRange = "this_month" | "last_month" | "last_3" | "last_6" | "this_year" | "custom";

function getDateRange(range: QuickRange, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (range) {
    case "this_month":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    case "last_month": {
      const last = subMonths(now, 1);
      return { from: format(startOfMonth(last), "yyyy-MM-dd"), to: format(endOfMonth(last), "yyyy-MM-dd") };
    }
    case "last_3": {
      const from = subMonths(now, 3);
      return { from: format(startOfMonth(from), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    case "last_6": {
      const from = subMonths(now, 6);
      return { from: format(startOfMonth(from), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    case "this_year":
      return { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(endOfYear(now), "yyyy-MM-dd") };
    case "custom":
      return { from: customFrom, to: customTo };
  }
}

const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3", label: "Last 3 months" },
  { value: "last_6", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
];

function InsightSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border-bottom)",
      }}
    >
      <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>{label}</p>
      <p className="mt-0.5 text-lg leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>{sub}</p>}
    </div>
  );
}

export default function InsightsPage() {
  const { isPremium } = useHousehold();
  const [quickRange, setQuickRange] = useState<QuickRange>("this_month");
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { from, to } = getDateRange(quickRange, customFrom, customTo);

  const { data, isLoading } = useQuery({
    queryKey: ["insights", from, to],
    queryFn: async () => {
      const r = await fetch(`/api/expenses/insights?from=${from}&to=${to}`);
      if (!r.ok) throw new Error("Failed to load insights");
      return r.json();
    },
    enabled: isPremium === true,
    staleTime: 60_000,
  });

  if (isPremium === false) {
    return (
      <PageContainer>
        <div className="py-6">
          <div className="mb-6 flex items-center gap-3">
            <Link
              href="/expenses"
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)" }}
            >
              <ArrowLeft className="size-4" style={{ color: "var(--roost-text-primary)" }} />
            </Link>
            <h1 className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              Spending Insights
            </h1>
          </div>
          <PremiumGate feature="insights" />
        </div>
      </PageContainer>
    );
  }

  const summary = data?.summary;
  const byCategory: { categoryId: string; name: string; icon: string; color: string; amount: number; percentage: number; count: number }[] = data?.byCategory ?? [];
  const overTime: { month: string; amount: number; expenseCount: number }[] = data?.overTime ?? [];
  const byMember: { userId: string; name: string; avatarColor: string | null; paid: number; owes: number; netAmount: number }[] = data?.byMember ?? [];

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--roost-surface)",
    border: "1.5px solid var(--roost-border)",
    borderBottom: "3px solid var(--roost-border-bottom)",
    borderRadius: 10,
    padding: "8px 12px",
    color: "var(--roost-text-primary)",
    fontWeight: 600,
    fontSize: 13,
  };

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="space-y-6 py-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/expenses"
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)" }}
          >
            <ArrowLeft className="size-4" style={{ color: "var(--roost-text-primary)" }} />
          </Link>
          <h1 className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
            Spending Insights
          </h1>
        </div>

        {/* Date range quick pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_RANGES.map(({ value, label }) => {
            const active = quickRange === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setQuickRange(value)}
                className="h-9 shrink-0 rounded-xl px-3 text-xs"
                style={{
                  border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                  borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                  backgroundColor: active ? `${COLOR}18` : "var(--roost-surface)",
                  color: active ? COLOR : "var(--roost-text-secondary)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Custom date inputs */}
        {quickRange === "custom" && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>To</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </div>
          </div>
        )}

        {isLoading ? (
          <InsightSkeleton />
        ) : !summary || summary.expenseCount === 0 ? (
          <div
            className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "2px dashed var(--roost-border)",
              borderBottom: "4px dashed var(--roost-border-bottom)",
            }}
          >
            <BarChart2 className="size-10" style={{ color: "var(--roost-text-muted)" }} />
            <p style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>No data for this period</p>
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Add expenses in this date range to see insights.
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="Total spent"
                value={`$${summary.totalSpent.toFixed(2)}`}
              />
              <SummaryCard
                label="Expenses"
                value={String(summary.expenseCount)}
                sub={`Avg $${summary.avgPerMember.toFixed(2)} per person`}
              />
              {summary.biggestCategory && (
                <SummaryCard
                  label="Top category"
                  value={summary.biggestCategory.name}
                  sub={`$${summary.biggestCategory.amount.toFixed(2)}`}
                />
              )}
              {summary.biggestExpense && (
                <SummaryCard
                  label="Biggest expense"
                  value={`$${summary.biggestExpense.amount.toFixed(2)}`}
                  sub={summary.biggestExpense.title}
                />
              )}
            </div>

            {/* Chart 1: Spending by category (Donut) */}
            {byCategory.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "4px solid var(--roost-border-bottom)",
                }}
              >
                <p className="mb-4 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  Where your money goes
                </p>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={2}
                      >
                        {byCategory.map((cat) => (
                          <Cell key={cat.categoryId} fill={cat.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Spent"]}
                        contentStyle={{
                          backgroundColor: "var(--roost-surface)",
                          border: "1.5px solid var(--roost-border)",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom legend */}
                <div className="mt-2 space-y-1.5">
                  {byCategory.map((cat) => (
                    <div key={cat.categoryId} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                          {cat.percentage}%
                        </span>
                        <span className="text-xs" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                          ${cat.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart 2: Spending over time (Line) */}
            {overTime.length >= 2 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "4px solid var(--roost-border-bottom)",
                }}
              >
                <p className="mb-4 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  Spending over time
                </p>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--roost-border)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Spent"]}
                        contentStyle={{
                          backgroundColor: "var(--roost-surface)",
                          border: "1.5px solid var(--roost-border)",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke={COLOR}
                        strokeWidth={2.5}
                        dot={{ fill: COLOR, r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Chart 3: By member (Horizontal bar) */}
            {byMember.length > 1 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "4px solid var(--roost-border-bottom)",
                }}
              >
                <p className="mb-4 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  By member
                </p>
                <div style={{ height: Math.max(120, byMember.length * 52) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={byMember}
                      margin={{ top: 0, right: 4, left: 60, bottom: 0 }}
                      barSize={12}
                      barGap={3}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--roost-border)" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fontWeight: 700, fill: "var(--roost-text-primary)" }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                        tickFormatter={(v) => v.split(" ")[0]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--roost-surface)",
                          border: "1.5px solid var(--roost-border)",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [
                          `$${Number(value).toFixed(2)}`,
                          name === "paid" ? "Paid" : "Owes",
                        ]}
                      />
                      <Bar dataKey="paid" name="paid" fill={COLOR} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="owes" name="owes" fill="#EF4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR }} />
                    <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>Paid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#EF4444" }} />
                    <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>Owes</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </PageContainer>
  );
}
