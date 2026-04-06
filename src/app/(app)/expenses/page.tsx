"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { motion } from "framer-motion";
import { DollarSign, PiggyBank, Plus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { relativeTime } from "@/lib/utils/time";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import MemberAvatar from "@/components/shared/MemberAvatar";
import ExpenseSheet, { type ExpenseData } from "@/components/expenses/ExpenseSheet";
import SettleSheet from "@/components/expenses/SettleSheet";
import { SECTION_COLORS } from "@/lib/constants/colors";
import { PageContainer } from "@/components/layout/PageContainer";

const COLOR = SECTION_COLORS.expenses; // #22C55E
const COLOR_DARK = "#16A34A";

// ---- Types ------------------------------------------------------------------

interface DebtItem {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

interface ExpensesResponse {
  expenses: ExpenseData[];
  balances: { userId: string; name: string; avatarColor: string | null; net: number }[];
  debts: DebtItem[];
  myBalance: number;
  isPremium: boolean;
}

interface MembersResponse {
  household: { id: string; name: string };
  members: { userId: string; name: string; avatarColor: string | null; role: string }[];
}

interface AllowancePayout {
  id: string;
  user_id: string;
  week_start: string;
  amount: string;
  earned: boolean;
  completion_rate: number;
  child_name: string;
  child_avatar: string | null;
}

interface AllowancesResponse {
  payouts: AllowancePayout[];
}

// ---- Loading skeleton -------------------------------------------------------

function ExpensesSkeleton() {
  return (
    <div className="space-y-3">
      {[80, 72, 64, 72].map((h, i) => (
        <Skeleton key={i} className="w-full rounded-2xl" style={{ height: h }} />
      ))}
    </div>
  );
}

// ---- Expense row -------------------------------------------------------------

function ExpenseRow({
  expense,
  index,
  currentUserId,
  onOpen,
}: {
  expense: ExpenseData;
  index: number;
  currentUserId: string;
  onOpen: () => void;
}) {
  const mySplit = expense.splits.find((s) => s.user_id === currentUserId);
  const iAmPayer = expense.paid_by === currentUserId;
  const unsettledOwed = expense.splits
    .filter((s) => !s.settled && s.user_id !== expense.paid_by)
    .reduce((acc, s) => acc + parseFloat(s.amount), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `4px solid ${COLOR_DARK}30`,
        cursor: "pointer",
        minHeight: 64,
      }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      {/* Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${COLOR}18` }}
      >
        <DollarSign className="size-5" style={{ color: COLOR }} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
          {expense.title}
        </p>
        <div className="flex items-center gap-1.5">
          {expense.payer_name && (
            <MemberAvatar name={expense.payer_name} avatarColor={expense.payer_avatar} size="sm" />
          )}
          <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            {expense.payer_name?.split(" ")[0] ?? "Someone"} · {expense.created_at ? relativeTime(expense.created_at) : ""}
          </span>
        </div>
      </div>

      {/* Amount + status */}
      <div className="text-right">
        <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          ${parseFloat(expense.total_amount).toFixed(2)}
        </p>
        {iAmPayer && unsettledOwed > 0 && (
          <p className="text-xs" style={{ color: COLOR, fontWeight: 700 }}>
            owed ${unsettledOwed.toFixed(2)}
          </p>
        )}
        {!iAmPayer && mySplit && !mySplit.settled && (
          <p className="text-xs" style={{ color: "#EF4444", fontWeight: 700 }}>
            you owe ${parseFloat(mySplit.amount).toFixed(2)}
          </p>
        )}
        {!iAmPayer && mySplit && mySplit.settled && (
          <p className="text-xs" style={{ color: COLOR, fontWeight: 700 }}>
            settled
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ---- Debt card ---------------------------------------------------------------

function DebtCard({
  debt,
  currentUserId,
  memberAvatars,
  onSettle,
}: {
  debt: DebtItem;
  currentUserId: string;
  memberAvatars: Record<string, string | null>;
  onSettle: () => void;
}) {
  const isOwer = debt.fromUserId === currentUserId;
  const otherName = isOwer ? debt.toName : debt.fromName;
  const otherUserId = isOwer ? debt.toUserId : debt.fromUserId;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: isOwer ? "4px solid #EF444460" : `4px solid ${COLOR}60`,
        minHeight: 64,
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: isOwer ? "#EF444418" : `${COLOR}18` }}
      >
        {isOwer ? (
          <TrendingDown className="size-5 text-red-500" />
        ) : (
          <TrendingUp className="size-5" style={{ color: COLOR }} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
          {isOwer ? `You owe ${otherName.split(" ")[0]}` : `${otherName.split(" ")[0]} owes you`}
        </p>
        <div className="flex items-center gap-1.5">
          <MemberAvatar name={otherName} avatarColor={memberAvatars[otherUserId] ?? null} size="sm" />
          <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            {otherName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm" style={{ color: isOwer ? "#EF4444" : COLOR, fontWeight: 800 }}>
          ${debt.amount.toFixed(2)}
        </p>
        <motion.button
          type="button"
          whileTap={{ y: 1 }}
          onClick={onSettle}
          className="flex h-9 items-center rounded-xl px-3 text-xs text-white"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontWeight: 800,
          }}
        >
          Settle
        </motion.button>
      </div>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function ExpensesPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const { isPremium, isLoading: householdLoading } = useHousehold();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | "view">("create");
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [settleSheetOpen, setSettleSheetOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [allowanceHistoryExpanded, setAllowanceHistoryExpanded] = useState(false);

  // ---- Queries ---------------------------------------------------------------

  const {
    data: expensesData,
    isLoading,
    isError,
    refetch,
  } = useQuery<ExpensesResponse>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const r = await fetch("/api/expenses");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load expenses");
      }
      return r.json();
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 2,
  });

  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const r = await fetch("/api/household/members");
      if (!r.ok) return { household: null, members: [] };
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  const { data: allowancesData } = useQuery<AllowancesResponse>({
    queryKey: ["allowances"],
    queryFn: async () => {
      const r = await fetch("/api/allowances");
      if (!r.ok) return { payouts: [] };
      return r.json();
    },
    staleTime: 60_000,
    retry: 1,
    enabled: isPremium,
  });

  // ---- Derived ---------------------------------------------------------------

  const allExpenses = expensesData?.expenses ?? [];
  const debts = expensesData?.debts ?? [];
  const myBalance = expensesData?.myBalance ?? 0;
  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  const memberAvatars: Record<string, string | null> = {};
  for (const m of members) memberAvatars[m.userId] = m.avatarColor;

  const myDebts = debts.filter((d) => d.fromUserId === currentUserId || d.toUserId === currentUserId);

  // Allowances — group payouts by child, keep last 8 weeks per child
  const allPayouts = allowancesData?.payouts ?? [];
  const childIds = [...new Set(allPayouts.map((p) => p.user_id))];
  const childMembers = members.filter((m) => m.role === "child" && childIds.includes(m.userId));
  const hasAllowances = childMembers.length > 0;

  // Current week range label
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekRangeLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;

  function childPayouts(userId: string): AllowancePayout[] {
    return allPayouts.filter((p) => p.user_id === userId);
  }

  function latestPayout(userId: string): AllowancePayout | undefined {
    return childPayouts(userId)[0];
  }

  function openCreate() {
    setSelectedExpense(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  function openView(expense: ExpenseData) {
    setSelectedExpense(expense);
    setSheetMode("view");
    setSheetOpen(true);
  }

  function openSettle(debt: DebtItem) {
    setSelectedDebt(debt);
    setSettleSheetOpen(true);
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <PageContainer className="flex flex-col gap-4">
      {/* Header */}
      <PageHeader
        title="Expenses"
        badge={isPremium ? allExpenses.length : undefined}
        color={COLOR}
        action={
          isPremium ? (
            <motion.button
              type="button"
              onClick={openCreate}
              whileTap={{ y: 1 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
              }}
              aria-label="New expense"
            >
              <Plus className="size-4 text-white" />
            </motion.button>
          ) : undefined
        }
      />

      {/* Loading */}
      {(isLoading || householdLoading) && <ExpensesSkeleton />}

      {/* Error */}
      {isError && !isLoading && !householdLoading && <ErrorState onRetry={refetch} />}

      {/* Free tier upgrade pitch */}
      {!isLoading && !householdLoading && !isError && !isPremium && (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: `${COLOR}10`,
              border: `1.5px solid ${COLOR}30`,
              borderBottom: `4px solid ${COLOR_DARK}40`,
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${COLOR}20` }}
              >
                <Sparkles className="size-5" style={{ color: COLOR }} />
              </div>
              <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                Track shared expenses
              </p>
            </div>
            <p className="mb-4 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Split bills, track who owes what, and settle up without the awkward conversations. Upgrade to Premium for $3/month.
            </p>
            <ul className="mb-4 space-y-1.5">
              {["Split bills equally or custom amounts", "Track who paid and who owes", "Debt simplification across the household", "Receipt scanning with Google Vision"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: COLOR }} />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/settings#section-billing"
              className="flex h-11 w-full items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 800,
              }}
            >
              Upgrade for $3/month
            </Link>
          </div>
        </div>
      )}

      {/* Premium content */}
      {!isLoading && !householdLoading && !isError && isPremium && (
        <>
          {/* Balance summary */}
          {myBalance !== 0 && (
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: myBalance > 0 ? `${COLOR}18` : "#EF444418",
                border: `1.5px solid ${myBalance > 0 ? COLOR : "#EF4444"}30`,
                borderBottom: `4px solid ${myBalance > 0 ? COLOR_DARK : "#C93B3B"}50`,
              }}
            >
              <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                {myBalance > 0 ? "You are owed" : "You owe"}
              </p>
              <p className="text-2xl" style={{ color: myBalance > 0 ? COLOR : "#EF4444", fontWeight: 900 }}>
                ${Math.abs(myBalance).toFixed(2)}
              </p>
            </div>
          )}

          {myBalance === 0 && allExpenses.length > 0 && (
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                backgroundColor: `${COLOR}18`,
                border: `1.5px solid ${COLOR}30`,
                borderBottom: `4px solid ${COLOR_DARK}30`,
              }}
            >
              <p className="text-sm" style={{ color: COLOR, fontWeight: 800 }}>
                All square. Everyone is even.
              </p>
            </div>
          )}

          {/* Debts / settle up */}
          {myDebts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                Settle up
              </p>
              {myDebts.map((debt) => (
                <DebtCard
                  key={`${debt.fromUserId}-${debt.toUserId}`}
                  debt={debt}
                  currentUserId={currentUserId}
                  memberAvatars={memberAvatars}
                  onSettle={() => openSettle(debt)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {allExpenses.length === 0 && (
            <EmptyState
              icon={DollarSign}
              title="All square."
              body="No expenses tracked. Either everyone is being weirdly generous, or nobody has added anything yet."
              color={COLOR}
              buttonLabel="Add expense"
              onButtonClick={openCreate}
            />
          )}

          {/* Expense list */}
          {allExpenses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                All expenses
              </p>
              {allExpenses.map((expense, i) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  index={i}
                  currentUserId={currentUserId}
                  onOpen={() => openView(expense)}
                />
              ))}
            </div>
          )}

          {/* Allowance section — premium + at least one child has allowance */}
          {hasAllowances && (
            <div className="space-y-2">
              {/* Section header */}
              <div className="flex items-center gap-2">
                <PiggyBank className="size-4" style={{ color: "#22C55E" }} />
                <p className="flex-1 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  Allowances
                </p>
                <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  {weekRangeLabel}
                </span>
              </div>

              {/* Child rows */}
              <div
                className="overflow-hidden rounded-2xl"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "4px solid #159040",
                }}
              >
                {childMembers.map((child, i) => {
                  const latest = latestPayout(child.userId);
                  const payoutForThisWeek =
                    latest && latest.week_start === format(weekStart, "yyyy-MM-dd")
                      ? latest
                      : undefined;

                  return (
                    <div
                      key={child.userId}
                      className="flex min-h-14 items-center gap-3 px-4 py-3"
                      style={{ borderTop: i > 0 ? "1px solid var(--roost-border)" : undefined }}
                    >
                      <MemberAvatar name={child.name} avatarColor={child.avatarColor} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                          {child.name}
                        </p>
                        {payoutForThisWeek ? (
                          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                            {payoutForThisWeek.completion_rate}% of chores done
                          </p>
                        ) : (
                          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                            Allowance evaluated Sunday
                          </p>
                        )}
                      </div>
                      {payoutForThisWeek ? (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: payoutForThisWeek.earned ? "#22C55E18" : "#EF444418",
                            color: payoutForThisWeek.earned ? "#22C55E" : "#EF4444",
                            border: `1px solid ${payoutForThisWeek.earned ? "#22C55E30" : "#EF444430"}`,
                            fontWeight: 700,
                          }}
                        >
                          {payoutForThisWeek.earned
                            ? `Earned $${parseFloat(payoutForThisWeek.amount).toFixed(2)}`
                            : "Missed this week"}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* View history toggle */}
              <button
                type="button"
                onClick={() => setAllowanceHistoryExpanded((v) => !v)}
                className="text-xs"
                style={{ color: "#22C55E", fontWeight: 700 }}
              >
                {allowanceHistoryExpanded ? "Hide history" : "View history"}
              </button>

              {/* Expanded history */}
              {allowanceHistoryExpanded && (
                <div className="space-y-3">
                  {childMembers.map((child) => {
                    const history = childPayouts(child.userId);
                    if (history.length === 0) return null;
                    return (
                      <div key={child.userId}>
                        <p className="mb-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                          {child.name}
                        </p>
                        <div
                          className="overflow-hidden rounded-xl"
                          style={{
                            border: "1.5px solid var(--roost-border)",
                            backgroundColor: "var(--roost-surface)",
                          }}
                        >
                          {history.slice(0, 8).map((payout, i) => {
                            const ws = parseISO(payout.week_start);
                            const label = `${format(ws, "MMM d")} – ${format(ws, "MMM")} ${format(new Date(ws.getTime() + 6 * 86400000), "d")}`;
                            return (
                              <div
                                key={payout.id}
                                className="flex items-center justify-between gap-2 px-3 py-2"
                                style={{ borderTop: i > 0 ? "1px solid var(--roost-border)" : undefined }}
                              >
                                <span className="text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                                  {label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[11px]"
                                    style={{
                                      backgroundColor: payout.earned ? "#22C55E18" : "#EF444418",
                                      color: payout.earned ? "#22C55E" : "#EF4444",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {payout.earned ? `$${parseFloat(payout.amount).toFixed(2)}` : "Missed"}
                                  </span>
                                  <span className="text-[11px]" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                                    {payout.completion_rate}% done
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Expense sheet */}
      <ExpenseSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedExpense(null); }}
        mode={sheetMode}
        expense={selectedExpense}
        currentUserId={currentUserId}
        isAdmin={isAdmin ?? false}
        members={members}
      />

      {/* Settle sheet */}
      <SettleSheet
        open={settleSheetOpen}
        onClose={() => { setSettleSheetOpen(false); setSelectedDebt(null); }}
        debt={selectedDebt}
        currentUserId={currentUserId}
        memberAvatars={memberAvatars}
      />
      </PageContainer>
    </motion.div>
  );
}
