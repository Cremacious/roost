"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, RefreshCw, Target } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import PremiumGate from "@/components/shared/PremiumGate";
import AddBudgetSheet from "@/components/expenses/AddBudgetSheet";
import EditBudgetSheet, { type BudgetData } from "@/components/expenses/EditBudgetSheet";
import { CategoryIcon } from "@/components/expenses/CategoryPicker";

const COLOR = "#22C55E";
const COLOR_DARK = "#16A34A";

interface BudgetsResponse {
  budgets: BudgetData[];
  totalBudgeted: number;
  totalSpent: number;
}

function BudgetSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ProgressBar({ percentage, status }: { percentage: number; status: "ok" | "warning" | "over" }) {
  const fillColor = status === "over" ? "#EF4444" : status === "warning" ? "#F59E0B" : COLOR;
  const width = Math.min(percentage, 100);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--roost-border)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: fillColor }}
      />
    </div>
  );
}

function BudgetCard({
  budget,
  index,
  onClick,
}: {
  budget: BudgetData;
  index: number;
  onClick: () => void;
}) {
  const statusColor = budget.status === "over" ? "#EF4444" : budget.status === "warning" ? "#F59E0B" : COLOR;
  const borderBottom =
    budget.status === "over"
      ? "4px solid #EF444450"
      : budget.status === "warning"
      ? "4px solid #F59E0B50"
      : `4px solid ${COLOR}50`;

  const percentLabel =
    budget.status === "over"
      ? `${budget.percentage}% — over budget!`
      : budget.status === "warning"
      ? `${budget.percentage}% used — approaching limit`
      : `${budget.percentage}% used`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="cursor-pointer rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom,
      }}
    >
      {/* Top row */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${budget.category.color}20` }}
          >
            <CategoryIcon icon={budget.category.icon} color={budget.category.color} size={18} />
          </div>
          <span style={{ color: "var(--roost-text-primary)", fontWeight: 800, fontSize: 14 }}>
            {budget.category.name}
          </span>
        </div>
        <span style={{ color: statusColor, fontWeight: 800, fontSize: 14 }}>
          ${budget.current_spent.toFixed(2)}{" "}
          <span style={{ color: "var(--roost-text-muted)", fontWeight: 600, fontSize: 12 }}>
            / ${budget.amount.toFixed(2)}
          </span>
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar percentage={budget.percentage} status={budget.status} />

      {/* Bottom row */}
      <div className="mt-1.5 flex items-center justify-between">
        <span style={{ color: statusColor, fontWeight: 700, fontSize: 12 }}>{percentLabel}</span>
        <span style={{ color: "var(--roost-text-muted)", fontWeight: 600, fontSize: 11 }}>
          {budget.reset_type === "monthly" && budget.daysUntilReset !== null
            ? `Resets in ${budget.daysUntilReset}d`
            : "Manual reset"}
        </span>
      </div>
    </motion.div>
  );
}

export default function BudgetPage() {
  const { isPremium, role } = useHousehold();
  const isAdmin = role === "admin";
  const [addOpen, setAddOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetData | null>(null);

  const { data, isLoading } = useQuery<BudgetsResponse>({
    queryKey: ["budgets"],
    queryFn: async () => {
      const r = await fetch("/api/expenses/budgets");
      if (!r.ok) throw new Error("Failed to load budgets");
      return r.json();
    },
    enabled: isPremium === true,
    staleTime: 30_000,
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
              Budgets
            </h1>
          </div>
          <PremiumGate feature="expenses" trigger="page" />
        </div>
      </PageContainer>
    );
  }

  const budgets = data?.budgets ?? [];
  const totalBudgeted = data?.totalBudgeted ?? 0;
  const totalSpent = data?.totalSpent ?? 0;
  const overallPct = totalBudgeted > 0 ? Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100) : 0;
  const overallStatus: "ok" | "warning" | "over" =
    overallPct >= 100 ? "over" : overallPct >= 80 ? "warning" : "ok";
  const existingCategoryIds = budgets.map((b) => b.category_id);

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="space-y-5 py-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/expenses"
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)" }}
            >
              <ArrowLeft className="size-4" style={{ color: "var(--roost-text-primary)" }} />
            </Link>
            <h1 className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              Budgets
            </h1>
          </div>
          {isAdmin && (
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => setAddOpen(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 700,
              }}
            >
              <Plus className="size-4" />
              Add budget
            </motion.button>
          )}
        </div>

        {isLoading ? (
          <BudgetSkeleton />
        ) : (
          <>
            {/* Summary hero */}
            {budgets.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: `4px solid ${overallStatus === "over" ? "#EF4444" : overallStatus === "warning" ? "#F59E0B" : COLOR}50`,
                }}
              >
                <div className="mb-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                      Total budgeted
                    </p>
                    <p className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                      ${totalBudgeted.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                      Total spent
                    </p>
                    <p
                      className="text-xl"
                      style={{
                        color: overallStatus === "over" ? "#EF4444" : overallStatus === "warning" ? "#F59E0B" : COLOR,
                        fontWeight: 900,
                      }}
                    >
                      ${totalSpent.toFixed(2)}
                    </p>
                  </div>
                </div>
                <ProgressBar percentage={overallPct} status={overallStatus} />
                <p className="mt-1 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  {overallPct}% of total budget used
                </p>
              </div>
            )}

            {/* Budget list */}
            {budgets.length === 0 ? (
              <div
                className="flex flex-col items-center gap-4 rounded-2xl p-8"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "2px dashed var(--roost-border)",
                  borderBottom: "4px dashed var(--roost-border-bottom)",
                }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: `4px solid ${COLOR}`,
                  }}
                >
                  <Target className="size-7" style={{ color: COLOR }} />
                </div>
                <div className="text-center">
                  <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                    No budgets set
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    Add a budget for any spending category to track your household expenses.
                  </p>
                </div>
                {isAdmin && (
                  <motion.button
                    type="button"
                    whileTap={{ y: 2 }}
                    onClick={() => setAddOpen(true)}
                    className="flex h-11 items-center gap-2 rounded-xl px-5 text-sm text-white"
                    style={{
                      backgroundColor: COLOR,
                      border: `1.5px solid ${COLOR}`,
                      borderBottom: `3px solid ${COLOR_DARK}`,
                      fontWeight: 700,
                    }}
                  >
                    <Plus className="size-4" />
                    Add your first budget
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.map((budget, i) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    index={i}
                    onClick={() => isAdmin && setEditBudget(budget)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {isAdmin && (
        <>
          <AddBudgetSheet
            open={addOpen}
            onClose={() => setAddOpen(false)}
            isAdmin={isAdmin}
            existingCategoryIds={existingCategoryIds}
          />
          <EditBudgetSheet
            open={!!editBudget}
            onClose={() => setEditBudget(null)}
            budget={editBudget}
          />
        </>
      )}
    </PageContainer>
  );
}
