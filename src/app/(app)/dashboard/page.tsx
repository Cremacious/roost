"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import {
  Bell,
  Calendar,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  FileText,
  Home,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { SECTION_COLORS, type SectionKey } from "@/lib/constants/colors";
import { PageContainer } from "@/components/layout/PageContainer";
import SlabCard from "@/components/shared/SlabCard";

// ---- Types ------------------------------------------------------------------

interface MembersResponse {
  household: { id: string; name: string; subscriptionStatus: string };
  members: { userId: string; name: string; avatarColor: string | null }[];
}

interface ExpensesSummaryResponse {
  myBalance: number;
}

interface ActivityAPIItem {
  id: string;
  type: string;
  description: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  created_at: string;
}

interface ActivityResponse {
  activity: ActivityAPIItem[];
  total: number;
  hasMore: boolean;
}

interface ActivityItem {
  id: string;
  section: SectionKey;
  memberName: string;
  action: string;
  timestamp: Date;
}

interface Tile {
  key: SectionKey;
  label: string;
  href: string;
  icon: React.ElementType;
  count: number;
  statusText: string;
}

// ---- Helpers ----------------------------------------------------------------

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const firstName = name.split(" ")[0];
  return `Good ${part}, ${firstName}.`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const TYPE_TO_SECTION: Record<string, SectionKey> = {
  chore_completed: "chores",
  item_added: "grocery",
  item_checked: "grocery",
  task_completed: "tasks",
  event_added: "calendar",
  note_added: "notes",
  expense_added: "expenses",
  meal_planned: "meals",
  meal_suggested: "meals",
  member_joined: "tasks",
};

function mapActivity(item: ActivityAPIItem): ActivityItem {
  return {
    id: item.id,
    section: (TYPE_TO_SECTION[item.type] ?? "tasks") as SectionKey,
    memberName: item.user_name,
    action: item.description,
    timestamp: new Date(item.created_at),
  };
}

// ---- Constants --------------------------------------------------------------

const TILES: Tile[] = [
  { key: "chores",    label: "Chores",    href: "/chores",    icon: CheckSquare,     count: 0, statusText: "View chores" },
  { key: "grocery",   label: "Grocery",   href: "/grocery",   icon: ShoppingCart,    count: 0, statusText: "Shopping list" },
  { key: "calendar",  label: "Calendar",  href: "/calendar",  icon: Calendar,        count: 0, statusText: "View calendar" },
  { key: "expenses",  label: "Expenses",  href: "/expenses",  icon: DollarSign,      count: 0, statusText: "All settled" },
  { key: "tasks",     label: "Tasks",     href: "/tasks",     icon: CheckCircle2,    count: 0, statusText: "View tasks" },
  { key: "notes",     label: "Notes",     href: "/notes",     icon: FileText,        count: 0, statusText: "No notes yet" },
  { key: "meals",     label: "Meals",     href: "/meals",     icon: UtensilsCrossed, count: 0, statusText: "Plan this week" },
  { key: "reminders", label: "Reminders", href: "/reminders", icon: Bell,            count: 0, statusText: "Nothing pending" },
];

// ---- Skeletons --------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="py-4 pb-24 md:py-6" style={{ backgroundColor: "var(--roost-bg)" }}>
      <PageContainer className="flex flex-col gap-5">
        <div className="space-y-1 py-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-lg" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      </PageContainer>
    </div>
  );
}

// ---- Sub-components ---------------------------------------------------------

function TileCard({ tile, index }: { tile: Tile; index: number }) {
  const router = useRouter();
  const color = SECTION_COLORS[tile.key];
  const Icon = tile.icon;

  return (
    <motion.button
      type="button"
      onClick={() => router.push(tile.href)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
      whileTap={{ y: 2 }}
      className="relative flex min-h-24 w-full flex-col justify-between rounded-2xl p-4 text-left"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border-bottom)",
      }}
    >
      {tile.count > 0 && (
        <span
          className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] text-white"
          style={{ backgroundColor: color, fontWeight: 700 }}
        >
          {tile.count}
        </span>
      )}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{
          backgroundColor: color + "18",
          border: `1px solid ${color}25`,
          borderBottom: `2px solid ${color}35`,
        }}
      >
        <Icon className="size-4" style={{ color }} />
      </div>
      <div>
        <p className="text-sm leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
          {tile.label}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
          {tile.statusText}
        </p>
      </div>
    </motion.button>
  );
}

function abbrev(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function ActivityFeed({
  items,
  hasMore,
  onSeeAll,
}: {
  items: ActivityItem[];
  hasMore: boolean;
  onSeeAll: () => void;
}) {
  if (items.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Recent Activity
          </h2>
        </div>
        <div
          className="flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "4px solid var(--roost-border-bottom)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}>
            Your household has been very quiet.
          </p>
          <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            Or everyone just got here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Recent Activity
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-sm"
          style={{ color: "#3B82F6", fontWeight: 700 }}
        >
          See all
        </button>
      </div>
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: "4px solid var(--roost-border-bottom)",
        }}
      >
        {items.map((item, i) => {
          const color = SECTION_COLORS[item.section];
          return (
            <div
              key={item.id}
              className="flex min-h-14 items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? "1px solid var(--roost-border)" : undefined }}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
                style={{ backgroundColor: color, fontWeight: 700 }}
              >
                {abbrev(item.memberName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}>
                  <span style={{ fontWeight: 700 }}>{item.memberName}</span>{" "}{item.action}
                </p>
              </div>
              <span className="shrink-0 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </span>
            </div>
          );
        })}
        {hasMore && (
          <div
            className="border-t px-4 py-3 text-center"
            style={{ borderColor: "var(--roost-border)" }}
          >
            <button
              type="button"
              onClick={onSeeAll}
              className="text-sm"
              style={{ color: "#3B82F6", fontWeight: 700 }}
            >
              See all activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const userName = sessionData?.user?.name ?? "";
  const { isPremium } = useHousehold();

  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useQuery<MembersResponse>({
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
    refetchInterval: 10_000,
    retry: 2,
  });

  const { data: expensesSummary } = useQuery<ExpensesSummaryResponse>({
    queryKey: ["expenses-summary"],
    queryFn: async () => {
      const r = await fetch("/api/expenses");
      if (!r.ok) return { myBalance: 0 };
      const d = await r.json();
      return { myBalance: d.myBalance ?? 0 };
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 1,
    enabled: isPremium,
  });

  const { data: remindersDueData } = useQuery<{ due: { id: string; title: string }[] }>({
    queryKey: ["reminders-due"],
    queryFn: async () => {
      const r = await fetch("/api/reminders/due");
      if (!r.ok) return { due: [] };
      return r.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: mealsTonightData } = useQuery<{ slots: { slot_type: string; meal_name: string | null; custom_meal_name: string | null }[] }>({
    queryKey: ["planner-tonight"],
    queryFn: async () => {
      const today = new Date();
      const dow = today.getDay();
      const diff = (dow === 0 ? -6 : 1 - dow);
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const weekStart = monday.toISOString().slice(0, 10);
      const r = await fetch(`/api/meals/planner?weekStart=${weekStart}`);
      if (!r.ok) return { slots: [] };
      return r.json();
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 1,
  });

  const {
    data: activityData,
    isError: activityError,
    refetch: refetchActivity,
  } = useQuery<ActivityResponse>({
    queryKey: ["household-activity"],
    queryFn: async () => {
      const r = await fetch("/api/household/activity?limit=5");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load activity");
      }
      return r.json();
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 2,
  });

  if (membersLoading) return <DashboardSkeleton />;

  if (membersError) {
    return (
      <div className="py-4 pb-24 md:py-6" style={{ backgroundColor: "var(--roost-bg)" }}>
        <PageContainer>
          <ErrorState onRetry={refetchMembers} />
        </PageContainer>
      </div>
    );
  }

  // Guard: user has no household yet
  if (membersData && !membersData.household) {
    return (
      <div className="py-4 pb-24 md:py-6" style={{ backgroundColor: "var(--roost-bg)" }}>
        <PageContainer>
          <EmptyState
            icon={Home}
            title="You are not in a household yet."
            body="Create one or join an existing one with a code from a housemate."
            buttonLabel="Get started"
            onButtonClick={() => router.push("/onboarding")}
            color="var(--roost-text-secondary)"
          />
        </PageContainer>
      </div>
    );
  }

  const householdName = membersData?.household?.name ?? "";
  const activityItems = (activityData?.activity ?? []).map(mapActivity);

  function expensesStatusText(): string {
    if (!isPremium) return "Premium feature";
    const bal = expensesSummary?.myBalance ?? 0;
    if (bal > 0.01) return `Owed $${bal.toFixed(2)}`;
    if (bal < -0.01) return `You owe $${Math.abs(bal).toFixed(2)}`;
    return "All settled";
  }

  function remindersStatusText(): string {
    const dueCount = remindersDueData?.due?.length ?? 0;
    if (dueCount === 0) return "Nothing due today";
    if (dueCount === 1) return "1 due today";
    return `${dueCount} due today`;
  }

  function mealsStatusText(): string {
    const tonightSlot = (mealsTonightData?.slots ?? []).find(
      (s) => s.slot_type === "dinner"
    );
    if (tonightSlot) {
      const name = tonightSlot.meal_name ?? tonightSlot.custom_meal_name;
      if (name) return `Tonight: ${name}`;
    }
    return "Nothing planned tonight";
  }

  const tiles = TILES.map((t) => {
    if (t.key === "expenses") return { ...t, statusText: expensesStatusText() };
    if (t.key === "meals") return { ...t, statusText: mealsStatusText() };
    if (t.key === "reminders") return { ...t, statusText: remindersStatusText() };
    return t;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <PageContainer className="flex flex-col gap-6">
        {/* Greeting */}
        {userName && (
          <div className="pt-2">
            <h1
              className="text-2xl md:text-3xl"
              style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
            >
              {getGreeting(userName)}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              {formatDate()}
              {householdName && ` · ${householdName}`}
            </p>
          </div>
        )}

        {/* Feature tiles grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((tile, i) => (
            <TileCard key={tile.key} tile={tile} index={i} />
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mb-4">
          {activityError
            ? <ErrorState onRetry={refetchActivity} />
            : (
              <ActivityFeed
                items={activityItems}
                hasMore={activityData?.hasMore ?? false}
                onSeeAll={() => router.push("/activity")}
              />
            )
          }
        </div>
      </PageContainer>
    </motion.div>
  );
}
