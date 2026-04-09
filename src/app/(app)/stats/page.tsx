"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { motion } from "framer-motion";
import {
  BarChart2,
  CheckSquare,
  DollarSign,
  ListTodo,
  ShoppingCart,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";
import { format, subDays, startOfYear, endOfYear } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import PremiumGate from "@/components/shared/PremiumGate";
import MemberAvatar from "@/components/shared/MemberAvatar";

const COLOR = "#6366F1";
const COLOR_DARK = "#4338CA";

// ---- Date range helpers -----------------------------------------------------

type QuickRange = "7d" | "30d" | "90d" | "year" | "custom";

function getDateRange(
  range: QuickRange,
  customFrom: string,
  customTo: string
): { start: string; end: string } {
  const now = new Date();
  switch (range) {
    case "7d":
      return { start: format(subDays(now, 7), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "30d":
      return { start: format(subDays(now, 30), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "90d":
      return { start: format(subDays(now, 90), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "year":
      return {
        start: format(startOfYear(now), "yyyy-MM-dd"),
        end: format(endOfYear(now), "yyyy-MM-dd"),
      };
    case "custom":
      return { start: customFrom, end: customTo };
  }
}

const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

// ---- Tooltip style ----------------------------------------------------------

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid var(--roost-border)",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 12,
};

// ---- Shared chart card ------------------------------------------------------

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border-bottom)",
      }}
    >
      <p className="mb-3 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ---- Skeleton ---------------------------------------------------------------

function StatsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ---- Empty chart state ------------------------------------------------------

function EmptyChart({ message }: { message: string }) {
  return (
    <div
      className="flex h-40 items-center justify-center rounded-xl"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
        {message}
      </p>
    </div>
  );
}

// ---- Stat card --------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `3px solid ${accent}`,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent + "18", border: `1px solid ${accent}25` }}
        >
          <Icon className="size-3.5" style={{ color: accent }} />
        </div>
        <p className="text-[11px] leading-tight" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
          {label}
        </p>
      </div>
      <p className="text-xl leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ---- Priority colors --------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
};

// ---- Horizontal bar colors --------------------------------------------------

const MEMBER_COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#22C55E", "#F97316", "#A855F7", "#06B6D4", "#EC4899"];

// ---- Activity group colors --------------------------------------------------

const GROUP_COLORS: Record<string, string> = {
  chores: "#EF4444",
  tasks: "#EC4899",
  expenses: "#22C55E",
  meals: "#F97316",
  grocery: "#F59E0B",
  other: "#9CA3AF",
};

// ---- Main page --------------------------------------------------------------

export default function StatsPage() {
  const { isPremium } = useHousehold();
  const [quickRange, setQuickRange] = useState<QuickRange>("30d");
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { start, end } = getDateRange(quickRange, customFrom, customTo);

  const { data, isLoading } = useQuery({
    queryKey: ["stats", start, end],
    queryFn: async () => {
      const r = await fetch(`/api/stats?start=${start}&end=${end}`);
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
    enabled: isPremium === true,
    staleTime: 60_000,
  });

  if (isPremium === false) {
    return (
      <PageContainer>
        <div className="py-6">
          <div className="mb-6">
            <h1 className="text-2xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              Household Stats
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Powered by your household data.
            </p>
          </div>
          <PremiumGate feature="stats" />
        </div>
      </PageContainer>
    );
  }

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

  // Typed slices
  const chores = data?.chores ?? {};
  const exp = data?.expenses ?? {};
  const taskData = data?.tasks ?? {};
  const mealData = data?.meals ?? {};
  const grocData = data?.grocery ?? {};
  const actData = data?.activity ?? {};
  const hhData = data?.household ?? {};

  // Activity breakdown as array for chart
  const activityGroups = Object.entries(actData.byTypeGroup ?? {})
    .filter(([, v]) => (v as number) > 0)
    .map(([group, count]) => ({ group: group.charAt(0).toUpperCase() + group.slice(1), count: count as number, rawGroup: group }))
    .sort((a, b) => b.count - a.count);

  // Members for completions lookup
  const completionsByMember: Record<string, number> = {};
  for (const m of chores.completionsPerMember ?? []) {
    completionsByMember[m.userId] = m.count;
  }
  const pointsByMember: Record<string, number> = {};
  for (const m of chores.pointsPerMember ?? []) {
    pointsByMember[m.userId] = m.totalPoints;
  }

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="space-y-6 py-6 pb-24 md:pb-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
            Household Stats
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            Powered by your household data.
          </p>
        </div>

        {/* Date range pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_RANGES.map(({ value, label }) => {
            const active = quickRange === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setQuickRange(value)}
                className="h-9 shrink-0 rounded-xl px-4 text-xs"
                style={{
                  backgroundColor: active ? COLOR : "var(--roost-surface)",
                  border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                  borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                  color: active ? "white" : "var(--roost-text-secondary)",
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
              <label className="mb-1 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                From
              </label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                To
              </label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <>
            {/* ---- Stat cards ------------------------------------------------ */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Chores Done"
                value={String(chores.totalCompletions ?? 0)}
                sub={chores.mostCompletedChore ? `Top: ${chores.mostCompletedChore.title}` : "No completions yet"}
                icon={CheckSquare}
                accent="#EF4444"
              />
              <StatCard
                label="Total Spent"
                value={`$${(exp.totalSpent ?? 0).toFixed(2)}`}
                sub={`${(exp.byCategory ?? []).length} categor${(exp.byCategory ?? []).length !== 1 ? "ies" : "y"}`}
                icon={DollarSign}
                accent="#22C55E"
              />
              <StatCard
                label="Tasks Completed"
                value={String(taskData.totalCompleted ?? 0)}
                sub={`${taskData.completionRate ?? 0}% completion rate`}
                icon={ListTodo}
                accent="#EC4899"
              />
              <StatCard
                label="Meals Planned"
                value={String(mealData.totalPlanned ?? 0)}
                sub={mealData.mostPlannedMeal ? `Fav: ${mealData.mostPlannedMeal.name}` : "No meals planned yet"}
                icon={UtensilsCrossed}
                accent="#F97316"
              />
              <StatCard
                label="Grocery Items"
                value={String(grocData.itemsAdded ?? 0)}
                sub={`${grocData.itemsChecked ?? 0} checked off`}
                icon={ShoppingCart}
                accent="#F59E0B"
              />
              <StatCard
                label="Most Active"
                value={actData.mostActiveMember ? actData.mostActiveMember.name.split(" ")[0] : "No activity"}
                sub={actData.mostActiveMember ? `${actData.mostActiveMember.count} actions` : undefined}
                icon={Trophy}
                accent={COLOR}
              />
            </div>

            {/* ---- Charts ---------------------------------------------------- */}
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Chart 1: Chore completions over time */}
              <ChartCard title="Chore Activity">
                {(chores.completionsOverTime?.length ?? 0) < 2 ? (
                  <EmptyChart message="No chore data for this period" />
                ) : (
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chores.completionsOverTime}
                        margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="choreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--roost-border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          tickFormatter={(v: any) => {
                            try { return format(new Date(v + "T00:00:00"), "Apr 8".length > 0 ? "MMM d" : "MMM d"); }
                            catch { return v; }
                          }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 9, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelFormatter={(v) => {
                            try { return format(new Date(v + "T00:00:00"), "MMM d, yyyy"); } catch { return v; }
                          }}
                          formatter={(value) => [value, "Completions"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#EF4444"
                          fill="url(#choreAreaGrad)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: "#EF4444", strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              {/* Chart 2: Spending over time */}
              <ChartCard title="Spending Over Time">
                {(exp.overTime?.length ?? 0) === 0 ? (
                  <EmptyChart message="No expense data for this period" />
                ) : (
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={exp.overTime}
                        margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--roost-border)" />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 9, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          tickFormatter={(v: any) => {
                            try { return format(new Date(v + "T00:00:00"), "MMM d"); } catch { return v; }
                          }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 9, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelFormatter={(v) => {
                            try { return `Week of ${format(new Date(v + "T00:00:00"), "MMM d")}`; } catch { return v; }
                          }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Spent"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#22C55E"
                          fill="url(#expAreaGrad)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: "#22C55E", strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              {/* Chart 3: Spending by category (donut) */}
              <ChartCard title="Spending by Category">
                {(exp.byCategory?.length ?? 0) === 0 ? (
                  <EmptyChart message="No expense data for this period" />
                ) : (
                  <>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={exp.byCategory}
                            dataKey="total"
                            nameKey="name"
                            innerRadius="55%"
                            outerRadius="80%"
                            paddingAngle={2}
                          >
                            {exp.byCategory.map((cat: { categoryId: string; color: string }) => (
                              <Cell key={cat.categoryId ?? cat.color} fill={cat.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Spent"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {exp.byCategory.slice(0, 5).map((cat: { categoryId: string; name: string; color: string; total: number }) => (
                        <div key={cat.categoryId ?? cat.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}>
                              {cat.name}
                            </span>
                          </div>
                          <span className="text-xs" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                            ${cat.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </ChartCard>

              {/* Chart 4: Chores per member */}
              <ChartCard title="Chores by Member">
                {(chores.completionsPerMember?.length ?? 0) === 0 ? (
                  <EmptyChart message="No chore completions yet" />
                ) : (
                  <div style={{ height: Math.max(120, (chores.completionsPerMember?.length ?? 1) * 44) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={chores.completionsPerMember}
                        margin={{ top: 0, right: 8, left: 60, bottom: 0 }}
                        barSize={12}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--roost-border)" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 10, fontWeight: 700, fill: "var(--roost-text-primary)" }}
                          axisLine={false}
                          tickLine={false}
                          width={56}
                          tickFormatter={(v: string) => v.split(" ")[0]}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value) => [value, "Completions"]}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {(chores.completionsPerMember ?? []).map((_: unknown, index: number) => (
                            <Cell key={index} fill={MEMBER_COLORS[index % MEMBER_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              {/* Chart 5: Activity breakdown */}
              <ChartCard title="Activity Breakdown">
                {activityGroups.length === 0 ? (
                  <EmptyChart message="No activity logged yet" />
                ) : (
                  <div style={{ height: Math.max(120, activityGroups.length * 44) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={activityGroups}
                        margin={{ top: 0, right: 8, left: 68, bottom: 0 }}
                        barSize={12}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--roost-border)" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9, fontWeight: 700, fill: "var(--roost-text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="group"
                          tick={{ fontSize: 10, fontWeight: 700, fill: "var(--roost-text-primary)" }}
                          axisLine={false}
                          tickLine={false}
                          width={64}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value) => [value, "Events"]}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {activityGroups.map((row, index) => (
                            <Cell key={index} fill={GROUP_COLORS[row.rawGroup] ?? COLOR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              {/* Chart 6: Task priority breakdown */}
              <ChartCard title="Tasks by Priority">
                {(taskData.byPriority?.length ?? 0) === 0 ? (
                  <EmptyChart message="No tasks created in this period" />
                ) : (
                  <>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskData.byPriority}
                            dataKey="count"
                            nameKey="priority"
                            innerRadius="45%"
                            outerRadius="75%"
                            paddingAngle={3}
                          >
                            {taskData.byPriority.map((p: { priority: string }) => (
                              <Cell key={p.priority} fill={PRIORITY_COLORS[p.priority] ?? "#9CA3AF"} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(value, name) => [
                              value,
                              String(name).charAt(0).toUpperCase() + String(name).slice(1),
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {taskData.byPriority.map((p: { priority: string; count: number }) => (
                        <div key={p.priority} className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: PRIORITY_COLORS[p.priority] ?? "#9CA3AF" }}
                          />
                          <span className="text-xs capitalize" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                            {p.priority} ({p.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </ChartCard>
            </div>

            {/* ---- Member overview ------------------------------------------- */}
            {(hhData.members?.length ?? 0) > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: `4px solid ${COLOR}`,
                }}
              >
                <div className="px-4 py-3">
                  <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                    Member Overview
                  </p>
                </div>
                <div
                  className="grid px-4 pb-2 text-xs"
                  style={{
                    gridTemplateColumns: "1fr auto auto",
                    gap: "0 16px",
                    color: "var(--roost-text-muted)",
                    fontWeight: 700,
                    borderTop: "1px solid var(--roost-border)",
                    paddingTop: 8,
                  }}
                >
                  <span>Member</span>
                  <span className="text-right">Chores</span>
                  <span className="text-right">Points</span>
                </div>
                {hhData.members.map(
                  (m: { userId: string; name: string; role: string; joinedAt: string | null }, i: number) => {
                    const comps = completionsByMember[m.userId] ?? 0;
                    const pts = pointsByMember[m.userId] ?? 0;
                    return (
                      <motion.div
                        key={m.userId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.15 }}
                        className="grid items-center px-4 py-3"
                        style={{
                          gridTemplateColumns: "1fr auto auto",
                          gap: "0 16px",
                          borderTop: "1px solid var(--roost-border)",
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <MemberAvatar name={m.name} avatarColor={null} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                              {m.name}
                            </p>
                            <p className="text-xs capitalize" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                              {m.role}
                              {m.joinedAt && (
                                <span> · since {format(new Date(m.joinedAt), "MMM yyyy")}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="text-right text-sm" style={{ color: "#EF4444", fontWeight: 800 }}>
                          {comps}
                        </span>
                        <span className="text-right text-sm" style={{ color: COLOR, fontWeight: 800 }}>
                          {pts}
                        </span>
                      </motion.div>
                    );
                  }
                )}
              </div>
            )}

            {/* ---- Household footer ----------------------------------------- */}
            <p className="text-center text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              {hhData.householdAge != null && (
                <>Your household is {hhData.householdAge} days old.</>
              )}
              {hhData.memberCount != null && (
                <> {hhData.memberCount} member{hhData.memberCount !== 1 ? "s" : ""}.</>
              )}
              {hhData.oldestMember && (
                <> Oldest member: {hhData.oldestMember.name.split(" ")[0]}, joined{" "}
                {hhData.oldestMember.joinedAt
                  ? format(new Date(hhData.oldestMember.joinedAt), "MMM yyyy")
                  : "unknown"}
                .</>
              )}
            </p>
          </>
        )}
      </motion.div>
    </PageContainer>
  );
}
