"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { motion } from "framer-motion";
import { DollarSign, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { relativeTime } from "@/lib/utils/time";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import MemberAvatar from "@/components/shared/MemberAvatar";
import ExpenseSheet, { type ExpenseData } from "@/components/expenses/ExpenseSheet";
import SettleSheet from "@/components/expenses/SettleSheet";
import { SECTION_COLORS } from "@/lib/constants/colors";

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

// ---- Mock data for premium gate blurred preview ----------------------------

const MOCK_EXPENSES: Partial<ExpenseData>[] = [
  { id: "1", title: "Groceries", total_amount: "84.50", payer_name: "Alex", payer_avatar: null, category: "Food", created_at: new Date(Date.now() - 86400000).toISOString(), splits: [] },
  { id: "2", title: "Electric bill", total_amount: "120.00", payer_name: "Jordan", payer_avatar: null, category: "Utilities", created_at: new Date(Date.now() - 172800000).toISOString(), splits: [] },
  { id: "3", title: "Netflix", total_amount: "18.00", payer_name: "Alex", payer_avatar: null, category: "Entertainment", created_at: new Date(Date.now() - 259200000).toISOString(), splits: [] },
];

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

// ---- Premium gate -----------------------------------------------------------

function PremiumGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="relative">
      {/* Blurred mock list */}
      <div className="pointer-events-none select-none space-y-3" style={{ filter: "blur(6px)", opacity: 0.5 }}>
        {MOCK_EXPENSES.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: `4px solid ${COLOR_DARK}30`,
              minHeight: 64,
            }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${COLOR}18` }}>
              <DollarSign className="size-5" style={{ color: COLOR }} />
            </div>
            <div className="flex-1">
              <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>{e.title}</p>
              <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>{e.payer_name} · just now</p>
            </div>
            <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>${e.total_amount}</p>
          </div>
        ))}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-6 text-center"
        style={{ background: "linear-gradient(to bottom, transparent, var(--roost-bg) 40%)" }}
      >
        <div
          className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${COLOR}18`, border: `1.5px solid ${COLOR}30` }}
        >
          <DollarSign className="size-7" style={{ color: COLOR }} />
        </div>
        <p className="mb-1 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Expense tracking is a premium feature
        </p>
        <p className="mb-5 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
          Track who paid what, split bills, and see who owes who at a glance.
        </p>
        <motion.button
          type="button"
          whileTap={{ y: 2 }}
          onClick={onUpgrade}
          className="flex h-12 items-center gap-2 rounded-xl px-6 text-sm text-white"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontWeight: 800,
          }}
        >
          Upgrade to Premium
        </motion.button>
      </div>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function ExpensesPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | "view">("create");
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [settleSheetOpen, setSettleSheetOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);

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

  // ---- Derived ---------------------------------------------------------------

  const allExpenses = expensesData?.expenses ?? [];
  const debts = expensesData?.debts ?? [];
  const myBalance = expensesData?.myBalance ?? 0;
  const isPremium = expensesData?.isPremium ?? false;
  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  const memberAvatars: Record<string, string | null> = {};
  for (const m of members) memberAvatars[m.userId] = m.avatarColor;

  const myDebts = debts.filter((d) => d.fromUserId === currentUserId || d.toUserId === currentUserId);

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
      className="flex flex-col gap-4 p-4 pb-24 md:p-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      {/* Header */}
      <PageHeader
        title="Expenses"
        badge={isPremium ? allExpenses.length : undefined}
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
      {isLoading && <ExpensesSkeleton />}

      {/* Error */}
      {isError && !isLoading && <ErrorState onRetry={refetch} />}

      {/* Premium gate */}
      {!isLoading && !isError && !isPremium && (
        <PremiumGate onUpgrade={() => window.location.href = "/settings"} />
      )}

      {/* Premium content */}
      {!isLoading && !isError && isPremium && (
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
    </motion.div>
  );
}
