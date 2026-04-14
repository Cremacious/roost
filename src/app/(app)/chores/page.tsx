"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  History,
  Info,
  Lock,
  Pencil,
  PiggyBank,
  Plus,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ChoreSheet, { type ChoreData } from "@/components/chores/ChoreSheet";
import LeaderboardSheet from "@/components/chores/LeaderboardSheet";
import RewardRuleSheet, { type RewardRule } from "@/components/chores/RewardRuleSheet";
import { SECTION_COLORS } from "@/lib/constants/colors";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import StatCard from "@/components/shared/StatCard";
import SectionColorBadge from "@/components/shared/SectionColorBadge";
import ErrorState from "@/components/shared/ErrorState";
import PremiumGate from "@/components/shared/PremiumGate";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/PageContainer";

// ---- Types ------------------------------------------------------------------

interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ChoreRow {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  custom_days: string | null;
  next_due_at: string | null;
  last_completed_at: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  created_by: string;
  household_id: string;
  category_id: string | null;
  category: ChoreCategory | null;
  is_complete_today: boolean;
  completed_today_by_me: boolean;
  latest_completion: { completedAt: string | null; completedBy: string } | null;
}

interface ChoresResponse {
  chores: ChoreRow[];
  householdId: string;
}

interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
  role: string;
}

interface MembersResponse {
  household: { id: string; name: string; subscriptionStatus: string };
  members: Member[];
}

// ---- Helpers ----------------------------------------------------------------

const COLOR = SECTION_COLORS.chores;

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function frequencyLabel(freq: string): string {
  switch (freq) {
    case "daily":   return "Daily";
    case "weekly":  return "Weekly";
    case "monthly": return "Monthly";
    case "custom":  return "Custom";
    default:        return freq;
  }
}

// ---- Page -------------------------------------------------------------------

export default function ChoresPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user.id ?? "";
  const queryClient = useQueryClient();

  const router = useRouter();
  const [view, setView] = useState<"mine" | "all">("mine");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreData | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);
  const [rewardSheetOpen, setRewardSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);

  // ---- Data ----------------------------------------------------------------

  const {
    data: choresData,
    isLoading: choresLoading,
    isError: choresError,
    refetch: refetchChores,
  } = useQuery<ChoresResponse>({
    queryKey: ["chores"],
    queryFn: async () => {
      const r = await fetch("/api/chores");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load chores");
      }
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const r = await fetch("/api/household/members");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load members");
      }
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  const { data: categoriesData } = useQuery<{ categories: ChoreCategory[] }>({
    queryKey: ["choreCategories"],
    queryFn: async () => {
      const r = await fetch("/api/chore-categories");
      if (!r.ok) throw new Error("Failed to load categories");
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: rewardsData } = useQuery<{ rules: (RewardRule & { child_name: string; child_avatar: string | null; currentPeriod: { start: string; end: string; total: number; completed: number; completionRate: number; onTrack: boolean } })[] }>({
    queryKey: ["rewards"],
    queryFn: async () => {
      const r = await fetch("/api/rewards");
      if (!r.ok) throw new Error("Failed to load rewards");
      return r.json();
    },
    staleTime: 30_000,
    enabled: membersData?.members?.find((m) => m.userId === currentUserId)?.role === "admin",
  });

  // ---- Mutations -----------------------------------------------------------

  const completeMutation = useMutation({
    mutationFn: (choreId: string) =>
      fetch(`/api/chores/${choreId}/complete`, { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error("Failed to complete chore");
        return r.json();
      }),
    onMutate: async (choreId) => {
      await queryClient.cancelQueries({ queryKey: ["chores"] });
      const previous = queryClient.getQueryData<ChoresResponse>(["chores"]);
      queryClient.setQueryData<ChoresResponse>(["chores"], (old) =>
        old ? { ...old, chores: old.chores.map((c) => c.id === choreId ? { ...c, is_complete_today: true, completed_today_by_me: true } : c) } : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["chores"], context.previous);
      toast.error("Could not complete chore", { description: "Something went wrong. Try again." });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      queryClient.invalidateQueries({ queryKey: ["rewards-child"] });
    },
  });

  const uncheckMutation = useMutation({
    mutationFn: (choreId: string) =>
      fetch(`/api/chores/${choreId}/complete`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Failed to uncheck chore");
        return r.json();
      }),
    onMutate: async (choreId) => {
      await queryClient.cancelQueries({ queryKey: ["chores"] });
      const previous = queryClient.getQueryData<ChoresResponse>(["chores"]);
      queryClient.setQueryData<ChoresResponse>(["chores"], (old) =>
        old ? { ...old, chores: old.chores.map((c) => c.id === choreId ? { ...c, is_complete_today: false, completed_today_by_me: false } : c) } : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["chores"], context.previous);
      toast.error("Could not uncheck chore", { description: "Something went wrong. Try again." });
    },
    onSuccess: (_data, choreId) => {
      toast("Chore unmarked", { action: { label: "Undo", onClick: () => completeMutation.mutate(choreId) } });
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      queryClient.invalidateQueries({ queryKey: ["rewards-child"] });
    },
  });

  // ---- Derived data --------------------------------------------------------

  const allChores = choresData?.chores ?? [];
  const members = membersData?.members ?? [];
  const categories = categoriesData?.categories ?? [];
  const rules = rewardsData?.rules ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";
  const isPremium = membersData?.household?.subscriptionStatus === "premium";
  const childMembers = members.filter((m) => m.role === "child");

  // Categories that actually have chores assigned (for filter pills)
  const usedCategoryIds = new Set(allChores.map((c) => c.category_id).filter(Boolean));
  const activeCategories = categories.filter((c) => usedCategoryIds.has(c.id));

  const viewFiltered = view === "mine"
    ? allChores.filter((c) => c.assigned_to === currentUserId || !c.assigned_to)
    : allChores;
  const filtered = categoryFilter
    ? viewFiltered.filter((c) => c.category_id === categoryFilter)
    : viewFiltered;

  const incomplete = filtered.filter((c) => !c.is_complete_today);
  const complete = filtered.filter((c) => c.is_complete_today);

  const doneToday = allChores.filter((c) => c.completed_today_by_me).length;
  const remaining = allChores.filter((c) => !c.is_complete_today && (c.assigned_to === currentUserId || !c.assigned_to)).length;

  const streakData = queryClient.getQueryData<{ leaderboard: { userId: string; currentStreak: number }[] }>(["chores-leaderboard"]);
  const myStreak = streakData?.leaderboard.find((e) => e.userId === currentUserId)?.currentStreak ?? 0;

  function openCreate() { setEditingChore(null); setSheetOpen(true); }
  function openEdit(chore: ChoreRow) {
    setEditingChore({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      frequency: chore.frequency,
      custom_days: chore.custom_days,
      assigned_to: chore.assigned_to,
      category_id: chore.category_id,
    });
    setSheetOpen(true);
  }

  // ---- Render --------------------------------------------------------------

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
            Chores
          </h1>
          {allChores.length > 0 && (
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs text-white"
              style={{ backgroundColor: COLOR, fontWeight: 700 }}
            >
              {allChores.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* + add chore — always visible, matches Tasks page pattern */}
          <motion.button
            type="button"
            onClick={openCreate}
            whileTap={{ y: 1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: "3px solid rgba(0,0,0,0.2)",
            }}
            aria-label="Add chore"
          >
            <Plus className="size-4 text-white" />
          </motion.button>

          {/* History — icon only on mobile, text+icon on desktop */}
          <motion.button
            type="button"
            onClick={() => isPremium ? router.push("/chores/history") : setUpgradeCode("HISTORY_PREMIUM")}
            whileTap={{ y: 1 }}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid #E5E7EB",
            }}
          >
            {!isPremium && <Lock className="size-3 mr-1" style={{ color: "var(--roost-text-muted)" }} />}
            <History className="size-4" style={{ color: COLOR }} />
          </motion.button>
          <motion.button
            type="button"
            onClick={() => isPremium ? router.push("/chores/history") : setUpgradeCode("HISTORY_PREMIUM")}
            whileTap={{ y: 1 }}
            className="hidden md:flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid #E5E7EB",
              color: "var(--roost-text-primary)",
              fontWeight: 700,
            }}
          >
            <History className="size-4" style={{ color: COLOR }} />
            History
            {!isPremium && <Lock className="size-3 ml-0.5" style={{ color: "var(--roost-text-muted)" }} />}
          </motion.button>

          {/* Leaderboard — icon only on mobile, text+icon on desktop */}
          <motion.button
            type="button"
            onClick={() => isPremium ? setLeaderboardOpen(true) : setUpgradeCode("LEADERBOARD_PREMIUM")}
            whileTap={{ y: 1 }}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid #E5E7EB",
            }}
          >
            {!isPremium && <Lock className="size-3 mr-1" style={{ color: "var(--roost-text-muted)" }} />}
            <Trophy className="size-4" style={{ color: "#F59E0B" }} />
          </motion.button>
          <motion.button
            type="button"
            onClick={() => isPremium ? setLeaderboardOpen(true) : setUpgradeCode("LEADERBOARD_PREMIUM")}
            whileTap={{ y: 1 }}
            className="hidden md:flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid #E5E7EB",
              color: "var(--roost-text-primary)",
              fontWeight: 700,
            }}
          >
            <Trophy className="size-4" style={{ color: "#F59E0B" }} />
            Leaderboard
            {!isPremium && <Lock className="size-3 ml-0.5" style={{ color: "var(--roost-text-muted)" }} />}
          </motion.button>

          {/* Rewards — hidden for children; icon only on mobile, text+icon on desktop */}
          {currentMember?.role !== "child" && (
            <>
              <motion.button
                type="button"
                onClick={() => isPremium ? router.push("/chores/allowances") : setUpgradeCode("ALLOWANCES_PREMIUM")}
                whileTap={{ y: 1 }}
                className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid #E5E7EB",
                }}
                aria-label="Rewards"
              >
                {!isPremium && <Lock className="size-3 mr-0.5" style={{ color: "var(--roost-text-muted)" }} />}
                <PiggyBank className="size-4" style={{ color: COLOR }} />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => isPremium ? router.push("/chores/allowances") : setUpgradeCode("ALLOWANCES_PREMIUM")}
                whileTap={{ y: 1 }}
                className="hidden md:flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid #E5E7EB",
                  color: "var(--roost-text-primary)",
                  fontWeight: 700,
                }}
              >
                <PiggyBank className="size-4" style={{ color: COLOR }} />
                Rewards
                {!isPremium && <Lock className="size-3 ml-0.5" style={{ color: "var(--roost-text-muted)" }} />}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard value={doneToday} label="Done today" color={COLOR} borderColor="#C93B3B" />
        <StatCard value={remaining} label="Remaining" borderColor="#C93B3B" />
        <StatCard value={`${myStreak}d`} label="Streak" color="#F59E0B" borderColor="#C93B3B" />
      </div>

      {/* Rewards section — only show when it is actionable:
          premium admin + at least one child account.
          Free users should only see the premium gate in sheet form when they
          tap a locked action, not as a large inline card on the page. */}
      {isAdmin && isPremium && childMembers.length > 0 && (
        <div className="mb-2">
          {/* Section header */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="size-4.5" style={{ color: COLOR }} />
                <span
                  className="text-[17px]"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
                >
                  Rewards
                </span>
              </div>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                Chore goals and prizes for your household
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                setEditingRule(null);
                setRewardSheetOpen(true);
              }}
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs"
              style={{
                backgroundColor: `${COLOR}12`,
                border: `1.5px solid ${COLOR}30`,
                borderBottom: `3px solid ${COLOR}50`,
                color: COLOR,
                fontWeight: 700,
              }}
            >
              <Plus className="size-3.5" />
              Add rule
            </motion.button>
          </div>

          {rules.length === 0 ? (
            /* Empty state */
            <div
              className="rounded-[12px] p-5 text-center"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "0.5px solid var(--roost-border)",
                borderBottom: `4px solid ${COLOR}`,
              }}
            >
              <Trophy
                className="mx-auto mb-2 size-8"
                style={{ color: COLOR }}
              />
              <p
                className="text-[15px]"
                style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
              >
                No rewards set up yet
              </p>
              <p
                className="mx-auto mt-1.5 max-w-70 text-xs leading-relaxed"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                Create a reward rule to motivate your kids. Set a weekly,
                monthly, or custom chore goal - when they hit the threshold,
                their reward unlocks automatically. Works for money, gifts,
                activities, or anything you choose.
              </p>
              <motion.button
                type="button"
                whileTap={{ y: 2 }}
                onClick={() => {
                  setEditingRule(null);
                  setRewardSheetOpen(true);
                }}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl px-5 text-sm text-white"
                style={{
                  backgroundColor: COLOR,
                  border: `1.5px solid ${COLOR}`,
                  borderBottom: "3px solid #B91C1C",
                  fontWeight: 800,
                  padding: "10px 20px",
                }}
              >
                <Plus className="size-4" />
                Add first reward
              </motion.button>
            </div>
          ) : (
            /* Rule cards */
            <div className="space-y-2">
              {rules.map((rule) => {
                const { currentPeriod } = rule;
                const periodLabel =
                  rule.period_type === "week"
                    ? "Weekly"
                    : rule.period_type === "month"
                    ? "Monthly"
                    : rule.period_type === "year"
                    ? "Yearly"
                    : `Every ${rule.period_days ?? "?"} days`;

                const rewardLabel =
                  rule.reward_type === "money" && rule.reward_amount
                    ? `$${parseFloat(String(rule.reward_amount)).toFixed(2)}`
                    : rule.reward_description
                    ? rule.reward_type === "gift"
                      ? `Gift: ${rule.reward_description.slice(0, 24)}${rule.reward_description.length > 24 ? "..." : ""}`
                      : rule.reward_type === "activity"
                      ? `Activity: ${rule.reward_description.slice(0, 24)}${rule.reward_description.length > 24 ? "..." : ""}`
                      : rule.reward_description.slice(0, 24) + (rule.reward_description.length > 24 ? "..." : "")
                    : "Reward";

                const periodPillColor =
                  rule.period_type === "week"
                    ? { bg: "#F59E0B18", border: "#F59E0B30", text: "#F59E0B" }
                    : rule.period_type === "month"
                    ? { bg: "#EF444418", border: "#EF444430", text: "#EF4444" }
                    : rule.period_type === "year"
                    ? { bg: "#3B82F618", border: "#3B82F630", text: "#3B82F6" }
                    : { bg: "#A855F718", border: "#A855F730", text: "#A855F7" };

                const rewardPillColor =
                  rule.reward_type === "money"
                    ? { bg: "#22C55E18", border: "#22C55E30", text: "#22C55E" }
                    : rule.reward_type === "gift"
                    ? { bg: "#A855F718", border: "#A855F730", text: "#A855F7" }
                    : rule.reward_type === "activity"
                    ? { bg: "#3B82F618", border: "#3B82F630", text: "#3B82F6" }
                    : { bg: "var(--roost-surface)", border: "var(--roost-border)", text: "var(--roost-text-secondary)" };

                return (
                  <div
                    key={rule.id}
                    className="rounded-[12px] px-4 py-3.5"
                    style={{
                      backgroundColor: "var(--roost-surface)",
                      border: "0.5px solid var(--roost-border)",
                      borderBottom: `4px solid ${COLOR}`,
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                            style={{ background: rule.child_avatar ?? "#6366f1" }}
                          >
                            {(rule.child_name ?? "?")
                              .split(" ")
                              .slice(0, 2)
                              .map((w: string) => w[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <span
                            className="text-sm"
                            style={{
                              color: "var(--roost-text-primary)",
                              fontWeight: 800,
                            }}
                          >
                            {rule.child_name ?? "Child"}
                          </span>
                        </div>
                        <p
                          className="mt-0.5 pl-10 text-xs"
                          style={{
                            color: "var(--roost-text-muted)",
                            fontWeight: 700,
                          }}
                        >
                          {rule.title}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRule(rule);
                            setRewardSheetOpen(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ color: "var(--roost-text-muted)" }}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={async (v) => {
                            await fetch(`/api/rewards/${rule.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ enabled: v }),
                            });
                            queryClient.invalidateQueries({ queryKey: ["rewards"] });
                          }}
                        />
                      </div>
                    </div>

                    {/* Badges row */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          backgroundColor: periodPillColor.bg,
                          border: `1px solid ${periodPillColor.border}`,
                          color: periodPillColor.text,
                          fontWeight: 700,
                        }}
                      >
                        {periodLabel}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          backgroundColor: rewardPillColor.bg,
                          border: `1px solid ${rewardPillColor.border}`,
                          color: rewardPillColor.text,
                          fontWeight: 700,
                        }}
                      >
                        {rewardLabel}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          backgroundColor: "var(--roost-bg)",
                          border: "1px solid var(--roost-border)",
                          color: "var(--roost-text-muted)",
                          fontWeight: 700,
                        }}
                      >
                        {rule.threshold_percent}% required
                      </span>
                    </div>

                    {/* Progress bar */}
                    {currentPeriod && (
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span
                            className="text-[11px]"
                            style={{
                              color: "var(--roost-text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            This period
                          </span>
                          <span
                            className="text-[11px]"
                            style={{
                              color: "var(--roost-text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            {currentPeriod.completed}/{currentPeriod.total} chores
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full"
                          style={{ backgroundColor: "var(--roost-border)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(currentPeriod.completionRate, 100)}%`,
                              backgroundColor: COLOR,
                            }}
                          />
                        </div>
                        <p
                          className="mt-1 text-[11px]"
                          style={{
                            color: currentPeriod.onTrack ? "#22C55E" : "var(--roost-text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          {currentPeriod.onTrack
                            ? "On track to earn reward"
                            : `${currentPeriod.completionRate}% - need ${rule.threshold_percent}% to earn`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Info callout */}
              <div className="flex items-start gap-1.5 pt-1">
                <Info
                  style={{
                    width: 12,
                    height: 12,
                    color: "var(--roost-text-muted)",
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                />
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  Roost evaluates rules automatically at the end of each period.
                  Money rewards are logged as expenses. Other rewards notify you
                  to arrange them.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View toggle */}
      <div
        className="flex overflow-hidden rounded-xl"
        style={{
          border: "1.5px solid var(--roost-border)",
          borderBottom: "3px solid #E5E7EB",
        }}
      >
        {(["mine", "all"] as const).map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className="flex-1 h-10 text-sm transition-colors"
            style={{
              borderLeft: i > 0 ? "1px solid var(--roost-border)" : undefined,
              backgroundColor: view === v ? COLOR : "var(--roost-surface)",
              color: view === v ? "white" : "var(--roost-text-secondary)",
              fontWeight: view === v ? 800 : 600,
            }}
          >
            {v === "mine" ? "My Chores" : "All Chores"}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      {activeCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs"
            style={{
              backgroundColor: categoryFilter === null ? COLOR : "var(--roost-surface)",
              border: `1.5px solid ${categoryFilter === null ? COLOR : "var(--roost-border)"}`,
              color: categoryFilter === null ? "white" : "var(--roost-text-secondary)",
              fontWeight: 700,
            }}
          >
            All
          </button>
          {activeCategories.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(active ? null : cat.id)}
                className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs"
                style={{
                  backgroundColor: active ? cat.color : "var(--roost-surface)",
                  border: `1.5px solid ${active ? cat.color : "var(--roost-border)"}`,
                  color: active ? "white" : "var(--roost-text-secondary)",
                  fontWeight: 700,
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {choresLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {choresError && !choresLoading && (
        <ErrorState onRetry={refetchChores} />
      )}

      {/* Empty state */}
      {!choresLoading && allChores.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "2px dashed var(--roost-border)",
            borderBottom: "2px dashed var(--roost-border-bottom)",
          }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: `4px solid #C93B3B`,
            }}
          >
            <ClipboardList className="size-7" style={{ color: COLOR }} />
          </div>
          <div className="space-y-1 max-w-xs">
            <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Suspiciously clean.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              No chores yet. Either you are very on top of things, or someone is avoiding this screen.
            </p>
          </div>
          <motion.button
            type="button"
            onClick={openCreate}
            whileTap={{ y: 2 }}
            className="mt-1 flex h-11 items-center gap-2 rounded-xl px-5 text-sm text-white"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: "3px solid #C93B3B",
              fontWeight: 800,
            }}
          >
            <Plus className="size-4" />
            Add the first chore
          </motion.button>
        </motion.div>
      )}

      {/* Incomplete chores */}
      <AnimatePresence>
        {incomplete.length > 0 && (
          <div className="space-y-2">
            {incomplete.map((chore, i) => (
              <motion.div
                key={chore.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
              >
                <ChoreItem
                  chore={chore}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onComplete={() => setPendingCompleteId(chore.id)}
                  onEdit={() => openEdit(chore)}
                  completing={completeMutation.isPending && completeMutation.variables === chore.id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Completed section */}
      {complete.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setCompletedExpanded((v) => !v)}
            className="flex w-full items-center justify-between py-2"
            style={{ color: "var(--roost-text-muted)" }}
          >
            <span className="text-sm" style={{ fontWeight: 700 }}>
              Completed today ({complete.length})
            </span>
            {completedExpanded
              ? <ChevronUp className="size-4" />
              : <ChevronDown className="size-4" />
            }
          </button>
          <AnimatePresence>
            {completedExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-2 overflow-hidden"
              >
                {complete.map((chore, i) => (
                  <motion.div
                    key={chore.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.12 }}
                  >
                    <ChoreItem
                      chore={chore}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      onComplete={() => uncheckMutation.mutate(chore.id)}
                      onEdit={() => openEdit(chore)}
                      completing={uncheckMutation.isPending && uncheckMutation.variables === chore.id}
                      done
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Confirm complete dialog */}
      <Dialog open={!!pendingCompleteId} onOpenChange={(v) => !v && setPendingCompleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Mark chore complete?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            {allChores.find((c) => c.id === pendingCompleteId)?.title}
          </DialogDescription>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setPendingCompleteId(null)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                border: "1.5px solid #E5E7EB",
                borderBottom: "3px solid #E5E7EB",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                if (pendingCompleteId) {
                  completeMutation.mutate(pendingCompleteId);
                  setPendingCompleteId(null);
                }
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: "3px solid rgba(0,0,0,0.2)",
                fontWeight: 800,
              }}
            >
              Mark complete
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChoreSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        chore={editingChore}
        members={members}
        isAdmin={isAdmin}
        isPremium={isPremium}
        onUpgradeRequired={(code) => { setSheetOpen(false); setUpgradeCode(code); }}
      />
      <LeaderboardSheet open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <RewardRuleSheet
        open={rewardSheetOpen}
        onClose={() => { setRewardSheetOpen(false); setEditingRule(null); }}
        rule={editingRule}
        members={childMembers}
      />

      {/* Upgrade prompt sheet */}
      {!!upgradeCode && (
        <PremiumGate feature="chores" trigger="sheet" onClose={() => setUpgradeCode(null)} />
      )}
      </PageContainer>
    </motion.div>
  );
}

// ---- ChoreItem sub-component ------------------------------------------------

function ChoreItem({
  chore,
  currentUserId,
  isAdmin,
  onComplete,
  onEdit,
  completing,
  done = false,
}: {
  chore: ChoreRow & { category?: ChoreCategory | null };
  currentUserId: string;
  isAdmin: boolean;
  onComplete: () => void;
  onEdit: () => void;
  completing: boolean;
  done?: boolean;
}) {
  const isOverdue = !done && chore.next_due_at != null && isPast(new Date(chore.next_due_at));
  const canEdit = isAdmin || chore.created_by === currentUserId;

  return (
    <div
      className="flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `4px solid ${isOverdue ? SECTION_COLORS.chores : "#C93B3B"}`,
        opacity: done ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {/* Complete button */}
      <button
        type="button"
        onClick={onComplete}
        disabled={completing}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        aria-label={done ? "Unmark complete" : "Mark complete"}
      >
        <motion.div
          animate={done ? { scale: [0.8, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <CheckCircle2
            className="size-7 transition-colors"
            style={{ color: done ? SECTION_COLORS.chores : SECTION_COLORS.chores + "40" }}
            strokeWidth={done ? 2.5 : 1.5}
          />
        </motion.div>
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-tight ${done ? "line-through" : ""}`}
          style={{
            color: done ? "var(--roost-text-muted)" : "var(--roost-text-primary)",
            fontWeight: done ? 600 : 700,
          }}
        >
          {chore.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <SectionColorBadge label={frequencyLabel(chore.frequency)} color={SECTION_COLORS.chores} />
          {chore.category && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{
                backgroundColor: `${chore.category.color}18`,
                color: chore.category.color,
                fontWeight: 700,
                border: `1px solid ${chore.category.color}30`,
              }}
            >
              {chore.category.name}
            </span>
          )}
          {chore.assignee_name && chore.assigned_to !== currentUserId && (
            <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              {chore.assignee_name}
            </span>
          )}
          {isOverdue && (
            <SectionColorBadge label="Overdue" color="#EF4444" />
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-1">
        {chore.assignee_name && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ background: chore.assignee_avatar ?? "#6366f1" }}
          >
            {initials(chore.assignee_name)}
          </div>
        )}
        {canEdit && !done && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ color: "var(--roost-text-muted)" }}
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
