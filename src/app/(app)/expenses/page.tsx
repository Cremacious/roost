"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart2,
  Clock,
  DollarSign,
  Download,
  MoreHorizontal,
  MoreVertical,
  PiggyBank,
  Plus,
  Receipt,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { relativeTime } from "@/lib/utils/time";
import { Skeleton } from "@/components/ui/skeleton";
import MemberAvatar from "@/components/shared/MemberAvatar";
import ExpenseSheet, { type ExpenseData, type RecurringTemplate } from "@/components/expenses/ExpenseSheet";
import SettleSheet from "@/components/expenses/SettleSheet";
import ExportSheet from "@/components/expenses/ExportSheet";
import RecurringDraftSheet from "@/components/expenses/RecurringDraftSheet";
import EditRecurringSheet, { type RecurringTemplateData } from "@/components/expenses/EditRecurringSheet";
import UpgradePrompt from "@/components/shared/UpgradePrompt";
import PremiumGate from "@/components/shared/PremiumGate";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  pendingClaim: { fromUserId: string; toUserId: string; amount: number; claimedAt: string } | null;
}

interface RecurringDraft {
  id: string;
  title: string;
  total_amount: string;
  paid_by: string;
  category: string | null;
  recurring_template_id: string | null;
  created_at: string | null;
  template_frequency: string | null;
  template_splits: { userId: string; amount: number }[] | null;
}

interface RecurringTemplateResponse {
  id: string;
  title: string;
  category: string | null;
  notes: string | null;
  total_amount: string;
  frequency: string;
  next_due_date: string;
  last_posted_at: string | null;
  paused: boolean;
  splits: { userId: string; amount: number }[];
  created_by: string;
  created_at: string | null;
}

interface ExpensesResponse {
  expenses: ExpenseData[];
  balances: { userId: string; name: string; avatarColor: string | null; net: number }[];
  debts: DebtItem[];
  myBalance: number;
  totalSpentThisMonth: number;
  isPremium: boolean;
  recurringDrafts: RecurringDraft[];
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

  const shareLabel = (() => {
    if (iAmPayer && unsettledOwed > 0) return { text: `owed $${unsettledOwed.toFixed(2)}`, color: COLOR };
    if (iAmPayer && unsettledOwed === 0) return { text: "settled", color: COLOR };
    if (!iAmPayer && mySplit && !mySplit.settled) return { text: `you owe $${parseFloat(mySplit.amount).toFixed(2)}`, color: "#EF4444" };
    if (!iAmPayer && mySplit && mySplit.settled) return { text: "settled", color: "var(--roost-text-muted)" };
    return null;
  })();

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
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${COLOR}18` }}
      >
        <DollarSign className="size-5" style={{ color: COLOR }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
            {expense.title}
          </p>
          {expense.receipt_data && (
            <Receipt className="size-3 shrink-0" style={{ color: COLOR }} />
          )}
          {expense.recurring_template_id && (
            <RefreshCw className="size-3 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {expense.payer_name && (
            <MemberAvatar name={expense.payer_name} avatarColor={expense.payer_avatar} size="sm" />
          )}
          <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            {expense.payer_name?.split(" ")[0] ?? "Someone"} · {expense.created_at ? relativeTime(expense.created_at) : ""}
          </span>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          ${parseFloat(expense.total_amount).toFixed(2)}
        </p>
        {shareLabel && (
          <p className="text-xs" style={{ color: shareLabel.color, fontWeight: 700 }}>
            {shareLabel.text}
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
  onSettle: (initialState?: "pending" | "initial") => void;
}) {
  const queryClient = useQueryClient();
  const [reminderSent, setReminderSent] = useState(false);

  const isOwer = debt.fromUserId === currentUserId;
  const otherName = isOwer ? debt.toName : debt.fromName;
  const otherUserId = isOwer ? debt.toUserId : debt.fromUserId;

  const iClaimedPending = debt.pendingClaim?.fromUserId === currentUserId;
  const theyClaimedPending = debt.pendingClaim?.toUserId === currentUserId;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  const remindMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/expenses/settle-all/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: debt.toUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        if (r.status === 429) throw new Error("You can only send one reminder per 24 hours.");
        throw new Error(d.error ?? "Could not send reminder");
      }
      return r.json();
    },
    onSuccess: () => { setReminderSent(true); invalidate(); toast.success("Reminder sent."); },
    onError: (err: Error) => toast.error("Could not send reminder", { description: err.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/expenses/settle-all/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: debt.toUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Could not cancel claim");
      }
      return r.json();
    },
    onSuccess: () => { invalidate(); toast.success("Claim cancelled."); },
    onError: (err: Error) => toast.error("Could not cancel claim", { description: err.message }),
  });

  // Border bottom varies by state
  const borderBottom = iClaimedPending
    ? "4px solid #FCD34D60"
    : theyClaimedPending
    ? `4px solid ${COLOR_DARK}`
    : isOwer
    ? "4px solid #EF444460"
    : `4px solid ${COLOR}60`;

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom,
        minHeight: 64,
        opacity: iClaimedPending ? 0.65 : 1,
        cursor: "pointer",
      }}
      onClick={() => onSettle(iClaimedPending ? "pending" : "initial")}
      onKeyDown={(e) => e.key === "Enter" && onSettle(iClaimedPending ? "pending" : "initial")}
    >
      {/* Icon */}
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

      {/* Left: label + name + pulse dot */}
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
          {isOwer ? `You owe ${otherName.split(" ")[0]}` : `${otherName.split(" ")[0]} owes you`}
        </p>
        <div className="flex items-center gap-1.5">
          <MemberAvatar name={otherName} avatarColor={memberAvatars[otherUserId] ?? null} size="sm" />
          <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            {otherName}
          </span>
          {theyClaimedPending && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: COLOR }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: COLOR }} />
            </span>
          )}
        </div>
      </div>

      {/* Right: amount + action */}
      <div className="flex flex-col items-end gap-1.5">
        <p
          className="text-sm"
          style={{
            color: iClaimedPending
              ? "var(--roost-text-secondary)"
              : isOwer
              ? "#EF4444"
              : COLOR,
            fontWeight: iClaimedPending ? 600 : 800,
          }}
        >
          ${debt.amount.toFixed(2)}
        </p>

        {iClaimedPending ? (
          <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
              style={{ backgroundColor: "#FEF3C7", color: "#D97706", fontWeight: 700 }}
            >
              <Clock className="size-3" />
              Awaiting confirmation
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remindMutation.mutate(); }}
                disabled={remindMutation.isPending || reminderSent}
                style={{ color: reminderSent ? "var(--roost-text-muted)" : "#D97706", fontWeight: 700 }}
              >
                {reminderSent ? "Sent" : "Remind"}
              </button>
              <span style={{ color: "var(--roost-text-muted)" }}>·</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}
                style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : theyClaimedPending ? (
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={(e) => { e.stopPropagation(); onSettle("initial"); }}
            className="inline-flex items-center rounded-xl px-2.5 text-[11px] text-white"
            style={{
              height: 28,
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              fontWeight: 800,
            }}
          >
            Confirm received
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={(e) => { e.stopPropagation(); onSettle("initial"); }}
            className="flex h-9 items-center rounded-xl px-3 text-xs text-white"
            style={{ backgroundColor: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800 }}
          >
            Settle
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ---- Balance chips (mobile) -------------------------------------------------

function BalanceChips({
  myBalance,
  totalSpentThisMonth,
}: {
  myBalance: number;
  totalSpentThisMonth: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeChip, setActiveChip] = useState(0);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth } = scrollRef.current;
    const chipWidth = scrollWidth / 3;
    setActiveChip(Math.round(scrollLeft / chipWidth));
  }

  const chips = [
    {
      label: myBalance > 0 ? "You're owed" : "You're owed",
      value: `$${Math.max(0, myBalance).toFixed(2)}`,
      valueColor: myBalance > 0 ? COLOR : "var(--roost-text-muted)",
      borderColor: myBalance > 0 ? COLOR : "var(--roost-border-bottom)",
    },
    {
      label: "You owe",
      value: `$${Math.max(0, -myBalance).toFixed(2)}`,
      valueColor: myBalance < 0 ? "#EF4444" : "var(--roost-text-muted)",
      borderColor: myBalance < 0 ? "#EF4444" : "var(--roost-border-bottom)",
    },
    {
      label: "Spent this month",
      value: `$${totalSpentThisMonth.toFixed(2)}`,
      valueColor: "var(--roost-text-primary)",
      borderColor: "var(--roost-border-bottom)",
    },
  ];

  return (
    <div className="relative md:hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {chips.map((chip, i) => (
          <div
            key={i}
            className="flex min-w-38.75 shrink-0 flex-col justify-center rounded-2xl px-4 py-3"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: `4px solid ${chip.borderColor}`,
              scrollSnapAlign: "start",
              minHeight: 68,
            }}
          >
            <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              {chip.label}
            </p>
            <p className="text-xl" style={{ color: chip.valueColor, fontWeight: 900 }}>
              {chip.value}
            </p>
          </div>
        ))}
        {/* Spacer for right fade */}
        <div className="min-w-2 shrink-0" />
      </div>

      {/* Right fade overlay */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-1 w-12"
        style={{ background: "linear-gradient(to right, transparent, var(--roost-bg))" }}
      />

      {/* Scroll dots */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {chips.map((_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              width: activeChip === i ? 18 : 6,
              borderRadius: 9999,
              backgroundColor: activeChip === i ? COLOR : "var(--roost-border-bottom)",
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Balance hero (desktop) -------------------------------------------------

function BalanceHero({
  myBalance,
  totalSpentThisMonth,
}: {
  myBalance: number;
  totalSpentThisMonth: number;
}) {
  return (
    <div
      className="hidden rounded-2xl p-4 md:block"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `4px solid ${myBalance > 0 ? COLOR_DARK : myBalance < 0 ? "#C93B3B" : "var(--roost-border-bottom)"}`,
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            You're owed
          </p>
          <p className="text-xl" style={{ color: myBalance > 0 ? COLOR : "var(--roost-text-muted)", fontWeight: 900 }}>
            ${Math.max(0, myBalance).toFixed(2)}
          </p>
        </div>
        <div className="border-x text-center" style={{ borderColor: "var(--roost-border)" }}>
          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            You owe
          </p>
          <p className="text-xl" style={{ color: myBalance < 0 ? "#EF4444" : "var(--roost-text-muted)", fontWeight: 900 }}>
            ${Math.max(0, -myBalance).toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            Spent this month
          </p>
          <p className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
            ${totalSpentThisMonth.toFixed(2)}
          </p>
        </div>
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
  const [settleInitialState, setSettleInitialState] = useState<"pending" | "initial">("initial");
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [allowanceHistoryExpanded, setAllowanceHistoryExpanded] = useState(false);
  const [recurringDraftsOpen, setRecurringDraftsOpen] = useState(false);
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "recurring">("expenses");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RecurringTemplateResponse | null>(null);

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

  const { data: recurringTemplatesData } = useQuery<{ templates: RecurringTemplateResponse[] }>({
    queryKey: ["recurringTemplates"],
    queryFn: async () => {
      const r = await fetch("/api/expenses/recurring");
      if (!r.ok) return { templates: [] };
      return r.json();
    },
    staleTime: 30_000,
    retry: 1,
    enabled: isPremium,
  });

  // ---- Derived ---------------------------------------------------------------

  const allExpenses = expensesData?.expenses ?? [];
  const debts = expensesData?.debts ?? [];
  const myBalance = expensesData?.myBalance ?? 0;
  const totalSpentThisMonth = expensesData?.totalSpentThisMonth ?? 0;
  const recurringDrafts = expensesData?.recurringDrafts ?? [];
  const recurringTemplates = recurringTemplatesData?.templates ?? [];
  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  const memberAvatars: Record<string, string | null> = {};
  for (const m of members) memberAvatars[m.userId] = m.avatarColor;

  const myDebts = debts.filter((d) => d.fromUserId === currentUserId || d.toUserId === currentUserId);

  // Pending confirmations: debts where current user is the creditor/payee and a claim is pending
  const pendingForMe = myDebts.filter((d) => d.pendingClaim && d.toUserId === currentUserId);

  // Allowances
  const allPayouts = allowancesData?.payouts ?? [];
  const childIds = [...new Set(allPayouts.map((p) => p.user_id))];
  const childMembers = members.filter((m) => m.role === "child" && childIds.includes(m.userId));
  const hasAllowances = childMembers.length > 0;

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
  function openSettle(debt: DebtItem, initialState: "pending" | "initial" = "initial") {
    setSelectedDebt(debt);
    setSettleInitialState(initialState);
    setSettleSheetOpen(true);
  }

  // ---- Render ----------------------------------------------------------------

  if (isPremium === false) {
    return (
      <PageContainer>
        <div className="py-6 pb-24">
          <PremiumGate feature="expenses" />
        </div>
      </PageContainer>
    );
  }

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
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              Expenses
              {isPremium && allExpenses.length > 0 && activeTab === "expenses" && (
                <span
                  className="ml-2 inline-flex h-6 items-center rounded-full px-2.5 text-xs"
                  style={{ backgroundColor: `${COLOR}18`, color: COLOR, fontWeight: 800 }}
                >
                  {allExpenses.length}
                </span>
              )}
            </h1>
          </div>

          {isPremium && (
            <div className="flex items-center gap-2">
              {/* Desktop: Budget + Insights + Export */}
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/expenses/budget"
                  className="flex h-10 items-center gap-1.5 rounded-xl px-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <Target className="size-4" />
                  Budget
                </Link>
                <Link
                  href="/expenses/insights"
                  className="flex h-10 items-center gap-1.5 rounded-xl px-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <BarChart2 className="size-4" />
                  Insights
                </Link>
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => setExportSheetOpen(true)}
                  className="flex h-10 items-center gap-1.5 rounded-xl px-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                  aria-label="Export expenses"
                >
                  <Download className="size-4" />
                  Export
                </motion.button>
              </div>

              {/* Mobile: Export + ••• */}
              <div className="flex items-center gap-2 sm:hidden">
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => setExportSheetOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                  }}
                  aria-label="Export expenses"
                >
                  <Download className="size-4" />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => setMoreMenuOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                  }}
                  aria-label="More options"
                >
                  <MoreHorizontal className="size-4" />
                </motion.button>
              </div>

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
            </div>
          )}
        </div>

        {/* Tab row — premium only */}
        {isPremium && (
          <div className="flex gap-2">
            {(["expenses", "recurring"] as const).map((tab) => {
              const active = activeTab === tab;
              const label = tab === "expenses" ? "Expenses" : "Recurring";
              const badge = tab === "recurring" && recurringTemplates.length > 0
                ? recurringTemplates.length
                : null;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm"
                  style={{
                    backgroundColor: active ? "var(--roost-text-primary)" : "var(--roost-surface)",
                    border: active ? "1.5px solid transparent" : "1.5px solid var(--roost-border)",
                    borderBottom: active ? "3px solid rgba(0,0,0,0.25)" : "3px solid var(--roost-border-bottom)",
                    color: active ? "var(--roost-bg)" : "var(--roost-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  {label}
                  {badge !== null && (
                    <span
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs"
                      style={{
                        backgroundColor: active ? "rgba(255,255,255,0.2)" : `${COLOR}20`,
                        color: active ? "var(--roost-bg)" : COLOR,
                        fontWeight: 800,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ===== EXPENSES TAB ===== */}
        {activeTab === "expenses" && <>

        {/* Loading */}
        {(isLoading || householdLoading) && <ExpensesSkeleton />}

        {/* Error */}
        {isError && !isLoading && !householdLoading && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: "var(--roost-surface)", border: "1.5px solid var(--roost-border)", borderBottom: "4px solid var(--roost-border-bottom)" }}
          >
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Could not load expenses.{" "}
              <button type="button" onClick={() => refetch()} style={{ color: COLOR, fontWeight: 700 }}>
                Try again
              </button>
            </p>
          </div>
        )}

        {/* Premium content */}
        {!isLoading && !householdLoading && !isError && isPremium && (
          <>
            {/* Mobile chip strip */}
            <BalanceChips myBalance={myBalance} totalSpentThisMonth={totalSpentThisMonth} />

            {/* Mobile: pending confirmations */}
            {pendingForMe.length > 0 && (
              <div className="space-y-2 md:hidden">
                <p className="text-xs" style={{ color: "#D97706", fontWeight: 700 }}>
                  Needs your confirmation
                </p>
                {pendingForMe.map((debt) => (
                  <div
                    key={`${debt.fromUserId}_${debt.toUserId}`}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: "#FFF7ED",
                      border: "1.5px solid #FED7AA",
                      borderBottom: "4px solid #F97316",
                      minHeight: 64,
                    }}
                  >
                    <MemberAvatar name={debt.fromName} avatarColor={memberAvatars[debt.fromUserId] ?? null} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "#92400E", fontWeight: 700 }}>
                        {debt.fromName.split(" ")[0]} says they paid you ${(debt.pendingClaim?.amount ?? debt.amount).toFixed(2)}
                      </p>
                      <p className="text-xs" style={{ color: "#B45309", fontWeight: 600 }}>
                        Tap to confirm or dispute
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ y: 1 }}
                      onClick={() => openSettle(debt)}
                      className="flex h-9 items-center rounded-xl px-3 text-xs text-white"
                      style={{ backgroundColor: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800 }}
                    >
                      Confirm
                    </motion.button>
                  </div>
                ))}
              </div>
            )}

            {/* Desktop two-column layout */}
            <div className="hidden md:grid md:grid-cols-[340px_1fr] md:gap-6">
              {/* Left column: balances */}
              <div className="flex flex-col gap-4">
                <BalanceHero myBalance={myBalance} totalSpentThisMonth={totalSpentThisMonth} />

                {/* Pending confirmations (desktop) */}
                {pendingForMe.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: "#D97706", fontWeight: 700 }}>
                      Needs your confirmation
                    </p>
                    {pendingForMe.map((debt) => (
                        <div
                          key={`${debt.fromUserId}_${debt.toUserId}`}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3"
                          style={{
                            backgroundColor: "#FFF7ED",
                            border: "1.5px solid #FED7AA",
                            borderBottom: "4px solid #F97316",
                            minHeight: 64,
                          }}
                        >
                          <MemberAvatar name={debt.fromName} avatarColor={memberAvatars[debt.fromUserId] ?? null} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: "#92400E", fontWeight: 700 }}>
                              {debt.fromName.split(" ")[0]} says they paid you ${(debt.pendingClaim?.amount ?? debt.amount).toFixed(2)}
                            </p>
                            <p className="text-xs" style={{ color: "#B45309", fontWeight: 600 }}>
                              Tap Confirm to review
                            </p>
                          </div>
                          <motion.button
                            type="button"
                            whileTap={{ y: 1 }}
                            onClick={() => openSettle(debt)}
                            className="flex h-9 items-center rounded-xl px-3 text-xs text-white"
                            style={{ backgroundColor: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800 }}
                          >
                            Confirm
                          </motion.button>
                        </div>
                    ))}
                  </div>
                )}

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
                        onSettle={(s) => openSettle(debt, s)}
                      />
                    ))}
                  </div>
                )}

                {myDebts.length === 0 && allExpenses.length > 0 && (
                  <div
                    className="rounded-2xl p-4 text-center"
                    style={{ backgroundColor: `${COLOR}18`, border: `1.5px solid ${COLOR}30`, borderBottom: `4px solid ${COLOR_DARK}30` }}
                  >
                    <p className="text-sm" style={{ color: COLOR, fontWeight: 800 }}>
                      All square. Everyone is even.
                    </p>
                  </div>
                )}

                {/* Allowance section */}
                {hasAllowances && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="size-4" style={{ color: COLOR }} />
                      <p className="flex-1 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                        Allowances
                      </p>
                      <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                        {weekRangeLabel}
                      </span>
                    </div>
                    <AllowanceTable
                      childMembers={childMembers}
                      latestPayout={latestPayout}
                      weekStart={weekStart}
                      allowanceHistoryExpanded={allowanceHistoryExpanded}
                      setAllowanceHistoryExpanded={setAllowanceHistoryExpanded}
                      childPayouts={childPayouts}
                    />
                  </div>
                )}
              </div>

              {/* Right column: expense list */}
              <div className="flex flex-col gap-4">
                {allExpenses.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl p-8 text-center"
                    style={{ backgroundColor: "var(--roost-surface)", border: "2px dashed var(--roost-border)", borderBottom: `4px dashed var(--roost-border-bottom)`, minHeight: 200 }}
                  >
                    <div
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "var(--roost-surface)", border: "1.5px solid var(--roost-border)", borderBottom: `4px solid ${COLOR}` }}
                    >
                      <DollarSign className="size-6" style={{ color: COLOR }} />
                    </div>
                    <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                      All square.
                    </p>
                    <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                      No expenses tracked. Either everyone is being weirdly generous, or nobody has added anything yet.
                    </p>
                    <motion.button
                      type="button"
                      whileTap={{ y: 2 }}
                      onClick={openCreate}
                      className="mt-4 flex h-11 items-center gap-2 rounded-xl px-4 text-sm text-white"
                      style={{ backgroundColor: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800 }}
                    >
                      <Plus className="size-4" />
                      Add expense
                    </motion.button>
                  </div>
                )}

                {allExpenses.length > 0 && (
                  <>
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                      All expenses
                    </p>
                    <div className="space-y-2">
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
                  </>
                )}
              </div>
            </div>

            {/* Mobile layout (single column) */}
            <div className="flex flex-col gap-4 md:hidden">
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

              {myDebts.length === 0 && allExpenses.length > 0 && (
                <div
                  className="rounded-2xl p-4 text-center"
                  style={{ backgroundColor: `${COLOR}18`, border: `1.5px solid ${COLOR}30`, borderBottom: `4px solid ${COLOR_DARK}30` }}
                >
                  <p className="text-sm" style={{ color: COLOR, fontWeight: 800 }}>
                    All square. Everyone is even.
                  </p>
                </div>
              )}

              {allExpenses.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl p-8 text-center"
                  style={{ backgroundColor: "var(--roost-surface)", border: "2px dashed var(--roost-border)", borderBottom: `4px dashed var(--roost-border-bottom)` }}
                >
                  <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "var(--roost-surface)", border: "1.5px solid var(--roost-border)", borderBottom: `4px solid ${COLOR}` }}
                  >
                    <DollarSign className="size-6" style={{ color: COLOR }} />
                  </div>
                  <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                    All square.
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    No expenses tracked yet.
                  </p>
                  <motion.button
                    type="button"
                    whileTap={{ y: 2 }}
                    onClick={openCreate}
                    className="mt-4 flex h-11 items-center gap-2 rounded-xl px-4 text-sm text-white"
                    style={{ backgroundColor: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800 }}
                  >
                    <Plus className="size-4" />
                    Add expense
                  </motion.button>
                </div>
              )}

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

              {hasAllowances && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="size-4" style={{ color: COLOR }} />
                    <p className="flex-1 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                      Allowances
                    </p>
                    <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      {weekRangeLabel}
                    </span>
                  </div>
                  <AllowanceTable
                    childMembers={childMembers}
                    latestPayout={latestPayout}
                    weekStart={weekStart}
                    allowanceHistoryExpanded={allowanceHistoryExpanded}
                    setAllowanceHistoryExpanded={setAllowanceHistoryExpanded}
                    childPayouts={childPayouts}
                  />
                </div>
              )}
            </div>
          </>
        )}

        </> /* end EXPENSES TAB */}

        {/* ===== RECURRING TAB ===== */}
        {activeTab === "recurring" && isPremium && (
          <RecurringTabView
            templates={recurringTemplates}
            recurringDrafts={recurringDrafts}
            isAdmin={isAdmin ?? false}
            members={members}
            onAddRecurring={() => { openCreate(); }}
            onEditTemplate={(t) => { setSelectedTemplate(t); setEditTemplateOpen(true); }}
            onPauseResume={(t) => { setSelectedTemplate(t); setEditTemplateOpen(true); }}
            onReviewDrafts={() => setRecurringDraftsOpen(true)}
          />
        )}

        {/* Sheets */}
        <ExpenseSheet
          open={sheetOpen}
          onClose={() => { setSheetOpen(false); setSelectedExpense(null); }}
          mode={sheetMode}
          expense={selectedExpense}
          currentUserId={currentUserId}
          isAdmin={isAdmin ?? false}
          members={members}
          isPremium={isPremium}
          recurringTemplate={
            selectedExpense?.recurring_template_id
              ? (recurringTemplates.find((t) => t.id === selectedExpense.recurring_template_id) as RecurringTemplate | undefined) ?? null
              : null
          }
          onUpgradeRequired={(code) => setUpgradeCode(code)}
        />

        <RecurringDraftSheet
          open={recurringDraftsOpen}
          onOpenChange={setRecurringDraftsOpen}
          drafts={recurringDrafts}
        />

        {selectedTemplate && (
          <EditRecurringSheet
            open={editTemplateOpen}
            onClose={() => { setEditTemplateOpen(false); setSelectedTemplate(null); }}
            template={selectedTemplate as RecurringTemplateData}
            members={members}
          />
        )}

        {/* Mobile more menu */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <div className="pt-2 pb-2">
              <p className="mb-4 text-base px-1" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                More options
              </p>
              <div className="space-y-2">
                <Link
                  href="/expenses/insights"
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    textDecoration: "none",
                    display: "flex",
                  }}
                >
                  <BarChart2 className="size-5" style={{ color: COLOR }} />
                  <span className="flex-1 text-left text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                    Spending insights
                  </span>
                </Link>
                <Link
                  href="/expenses/budget"
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    textDecoration: "none",
                    display: "flex",
                  }}
                >
                  <Target className="size-5" style={{ color: COLOR }} />
                  <span className="flex-1 text-left text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                    Budgets
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => { setActiveTab("recurring"); setMoreMenuOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                  }}
                >
                  <RefreshCw className="size-5" style={{ color: COLOR }} />
                  <span className="flex-1 text-left text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                    Recurring expenses
                  </span>
                  {recurringTemplates.length > 0 && (
                    <span
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs"
                      style={{ backgroundColor: `${COLOR}20`, color: COLOR, fontWeight: 800 }}
                    >
                      {recurringTemplates.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <SettleSheet
          open={settleSheetOpen}
          onClose={() => { setSettleSheetOpen(false); setSelectedDebt(null); setSettleInitialState("initial"); }}
          debt={selectedDebt}
          currentUserId={currentUserId}
          memberAvatars={memberAvatars}
          pendingClaim={selectedDebt?.pendingClaim ?? null}
          initialState={settleInitialState}
        />

        <ExportSheet
          open={exportSheetOpen}
          onClose={() => setExportSheetOpen(false)}
        />

        {/* Upgrade prompt sheet */}
        <Sheet open={!!upgradeCode} onOpenChange={(v) => !v && setUpgradeCode(null)}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            {upgradeCode && (
              <UpgradePrompt code={upgradeCode} onDismiss={() => setUpgradeCode(null)} />
            )}
          </SheetContent>
        </Sheet>
      </PageContainer>
    </motion.div>
  );
}

// ---- Recurring tab view -------------------------------------------------------

const FREQ_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  weekly:   { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  biweekly: { bg: "#FAF5FF", text: "#7C3AED", border: "#DDD6FE" },
  monthly:  { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  yearly:   { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
};

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly", yearly: "Yearly",
};

function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":   return amount * (52 / 12);
    case "biweekly": return amount * (26 / 12);
    case "monthly":  return amount;
    case "yearly":   return amount / 12;
    default: return amount;
  }
}

function RecurringTabView({
  templates,
  recurringDrafts,
  isAdmin,
  members,
  onAddRecurring,
  onEditTemplate,
  onReviewDrafts,
}: {
  templates: RecurringTemplateResponse[];
  recurringDrafts: RecurringDraft[];
  isAdmin: boolean;
  members: { userId: string; name: string; avatarColor: string | null; role: string }[];
  onAddRecurring: () => void;
  onEditTemplate: (t: RecurringTemplateResponse) => void;
  onPauseResume: (t: RecurringTemplateResponse) => void;
  onReviewDrafts: () => void;
}) {
  const queryClient = useQueryClient();

  const pauseResumeMutation = useMutation({
    mutationFn: async ({ id, paused }: { id: string; paused: boolean }) => {
      const r = await fetch(`/api/expenses/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused }),
      });
      if (!r.ok) throw new Error("Failed to update");
      return r.json();
    },
    onSuccess: (_, { paused }) => {
      queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] });
      toast.success(paused ? "Recurring paused" : "Recurring resumed");
    },
    onError: () => toast.error("Failed to update", { description: "Please try again." }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/expenses/recurring/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Recurring expense removed");
    },
    onError: () => toast.error("Failed to delete", { description: "Please try again." }),
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const templateToDelete = templates.find((t) => t.id === confirmDeleteId);

  const totalMonthly = templates
    .filter((t) => !t.paused)
    .reduce((acc, t) => acc + monthlyEquivalent(parseFloat(t.total_amount ?? "0"), t.frequency), 0);

  const soonestDue = templates.reduce<string | null>((acc, t) => {
    if (!acc) return t.next_due_date;
    return t.next_due_date < acc ? t.next_due_date : acc;
  }, null);

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        {/* Draft banner even with no templates */}
        {isAdmin && recurringDrafts.length > 0 && (
          <DraftBanner count={recurringDrafts.length} onReview={onReviewDrafts} />
        )}
        <div
          className="flex flex-col items-center justify-center rounded-2xl p-8 text-center"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "2px dashed var(--roost-border)",
            borderBottom: "4px dashed var(--roost-border-bottom)",
            minHeight: 200,
          }}
        >
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: `4px solid ${SECTION_COLORS.expenses}`,
            }}
          >
            <RefreshCw className="size-6" style={{ color: SECTION_COLORS.expenses }} />
          </div>
          <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            No recurring expenses yet
          </p>
          <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            Set up recurring expenses for rent, utilities, subscriptions, anything you split regularly.
          </p>
          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={onAddRecurring}
            className="mt-4 flex h-11 items-center gap-2 rounded-xl px-4 text-sm text-white"
            style={{
              backgroundColor: SECTION_COLORS.expenses,
              border: `1.5px solid ${SECTION_COLORS.expenses}`,
              borderBottom: "3px solid #16A34A",
              fontWeight: 800,
            }}
          >
            <Plus className="size-4" />
            Add recurring expense
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Draft banner */}
      {isAdmin && recurringDrafts.length > 0 && (
        <DraftBanner count={recurringDrafts.length} onReview={onReviewDrafts} />
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active", value: templates.filter((t) => !t.paused).length.toString() },
          { label: "Per month", value: `$${totalMonthly.toFixed(0)}` },
          { label: "Next due", value: soonestDue ? format(new Date(`${soonestDue}T00:00:00`), "MMM d") : "None" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl p-3 text-center"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid var(--roost-border-bottom)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              {label}
            </p>
            <p className="text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Template list */}
      <div className="space-y-2">
        {templates.map((t, i) => {
          const freqColors = FREQ_COLORS[t.frequency] ?? FREQ_COLORS.monthly;
          const amount = parseFloat(t.total_amount ?? "0");
          const splitCount = (t.splits as { userId: string }[])?.length ?? 0;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
              role="button"
              tabIndex={0}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: t.paused ? "4px solid #E5E7EB" : `4px solid ${SECTION_COLORS.expenses}60`,
                cursor: "pointer",
                opacity: t.paused ? 0.7 : 1,
                minHeight: 72,
              }}
              onClick={() => onEditTemplate(t)}
              onKeyDown={(e) => e.key === "Enter" && onEditTemplate(t)}
            >
              {/* Icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${SECTION_COLORS.expenses}18` }}
              >
                <RefreshCw className="size-5" style={{ color: SECTION_COLORS.expenses }} />
              </div>

              {/* Middle */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm truncate" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                    {t.title}
                  </p>
                  <span
                    className="inline-flex h-5 items-center rounded-full px-2 text-xs shrink-0"
                    style={{
                      backgroundColor: freqColors.bg,
                      color: freqColors.text,
                      border: `1px solid ${freqColors.border}`,
                      fontWeight: 700,
                    }}
                  >
                    {FREQ_LABELS[t.frequency] ?? t.frequency}
                  </span>
                  {t.paused && (
                    <span
                      className="inline-flex h-5 items-center rounded-full px-2 text-xs shrink-0"
                      style={{ backgroundColor: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A", fontWeight: 700 }}
                    >
                      Paused
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Next: {format(new Date(`${t.next_due_date}T00:00:00`), "MMM d")}
                  {splitCount > 0 && ` · Split between ${splitCount} member${splitCount !== 1 ? "s" : ""}`}
                </p>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  ${amount.toFixed(2)}
                </p>

                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{
                          border: "1.5px solid var(--roost-border)",
                          color: "var(--roost-text-muted)",
                        }}
                        aria-label="Template options"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onEditTemplate(t)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => pauseResumeMutation.mutate({ id: t.id, paused: !t.paused })}>
                        {t.paused ? "Resume" : "Pause"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={() => setConfirmDeleteId(t.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Stop this recurring expense?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            Past expenses won&apos;t be deleted. No new drafts will be created for{" "}
            <strong>{templateToDelete?.title}</strong>.
          </p>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{ border: "1.5px solid #E5E7EB", borderBottom: "3px solid #E5E7EB", color: "var(--roost-text-primary)", fontWeight: 700 }}
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => { if (confirmDeleteId) { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); } }}
              disabled={deleteMutation.isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800 }}
            >
              Stop recurring
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DraftBanner({ count, onReview }: { count: number; onReview: () => void }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: "#FFFBEB", border: "1.5px solid #FCD34D", borderBottom: "4px solid #D97706" }}
    >
      <AlertTriangle className="size-5 shrink-0" style={{ color: "#D97706" }} />
      <p className="flex-1 text-sm" style={{ color: "#92400E", fontWeight: 700 }}>
        {count} recurring expense{count !== 1 ? "s" : ""} due for posting.
      </p>
      <motion.button
        type="button"
        whileTap={{ y: 1 }}
        onClick={onReview}
        className="flex h-9 items-center rounded-xl px-3 text-xs text-white"
        style={{ backgroundColor: "#D97706", border: "1.5px solid #B45309", borderBottom: "3px solid #92400E", fontWeight: 800 }}
      >
        Review
      </motion.button>
    </div>
  );
}

// ---- Allowance table (extracted to avoid duplication) -----------------------

function AllowanceTable({
  childMembers,
  latestPayout,
  weekStart,
  allowanceHistoryExpanded,
  setAllowanceHistoryExpanded,
  childPayouts,
}: {
  childMembers: { userId: string; name: string; avatarColor: string | null; role: string }[];
  latestPayout: (id: string) => AllowancePayout | undefined;
  weekStart: Date;
  allowanceHistoryExpanded: boolean;
  setAllowanceHistoryExpanded: (v: boolean) => void;
  childPayouts: (id: string) => AllowancePayout[];
}) {
  const COLOR = "#22C55E";

  return (
    <>
      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: "var(--roost-surface)", border: "1.5px solid var(--roost-border)", borderBottom: "4px solid #159040" }}
      >
        {childMembers.map((child, i) => {
          const latest = latestPayout(child.userId);
          const payoutForThisWeek = latest && latest.week_start === format(weekStart, "yyyy-MM-dd") ? latest : undefined;
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
                  {payoutForThisWeek.earned ? `Earned $${parseFloat(payoutForThisWeek.amount).toFixed(2)}` : "Missed this week"}
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

      <button
        type="button"
        onClick={() => setAllowanceHistoryExpanded(!allowanceHistoryExpanded)}
        className="text-xs"
        style={{ color: COLOR, fontWeight: 700 }}
      >
        {allowanceHistoryExpanded ? "Hide history" : "View history"}
      </button>

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
                  style={{ border: "1.5px solid var(--roost-border)", backgroundColor: "var(--roost-surface)" }}
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
    </>
  );
}
