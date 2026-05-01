"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import {
  BarChart2,
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { SECTION_COLORS, type SectionKey } from "@/lib/constants/colors";
import { PageContainer } from "@/components/layout/PageContainer";
import HouseholdJoinRequestsCard from "@/components/household/HouseholdJoinRequestsCard";
import RewardsWidget from "@/components/shared/RewardsWidget";
import WelcomeModal from "@/components/shared/WelcomeModal";

// ---- Types ------------------------------------------------------------------

interface ActivityAPIItem {
  id: string;
  type: string;
  description: string;
  user_name: string;
  created_at: string;
}

interface DashboardSummaryResponse {
  household: { id: string; name: string } | null;
  role: string | null;
  isPremium: boolean;
  hasSeenWelcome: boolean;
  myBalance: number;
  dueReminderCount: number;
  tonightMealName: string | null;
  activity: ActivityAPIItem[];
  activityHasMore: boolean;
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
  allowance_earned: "expenses",
  allowance_missed: "expenses",
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

// ---- Card style config per section ------------------------------------------

const TILE_STYLES: Record<SectionKey, { badgeBg: string; slabBorder: string; iconStroke: string }> = {
  chores:    { badgeBg: "#FEF2F2", slabBorder: "#E24B4A", iconStroke: "#A32D2D" },
  grocery:   { badgeBg: "#FFFBEB", slabBorder: "#BA7517", iconStroke: "#92400E" },
  calendar:  { badgeBg: "#EFF6FF", slabBorder: "#185FA5", iconStroke: "#1E40AF" },
  expenses:  { badgeBg: "#F0FDF4", slabBorder: "#3B6D11", iconStroke: "#166534" },
  tasks:     { badgeBg: "#FDF2F8", slabBorder: "#993556", iconStroke: "#9D174D" },
  notes:     { badgeBg: "#FAF5FF", slabBorder: "#534AB7", iconStroke: "#6D28D9" },
  meals:     { badgeBg: "#FFFBEB", slabBorder: "#854F0B", iconStroke: "#9A3412" },
  reminders: { badgeBg: "#F0FDFA", slabBorder: "#0F6E56", iconStroke: "#115E59" },
  stats:     { badgeBg: "#F3F4F6", slabBorder: "#5F5E5A", iconStroke: "#4B5563" },
};

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
  { key: "stats",     label: "Stats",     href: "/stats",     icon: BarChart2,       count: 0, statusText: "Household stats" },
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
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

function TileCard({ tile, index, isPremium }: { tile: Tile; index: number; isPremium: boolean }) {
  const router = useRouter();
  const styles = TILE_STYLES[tile.key];
  const Icon = tile.icon;
  const isExpensesPremiumText = tile.key === "expenses" && !isPremium;

  return (
    <motion.button
      type="button"
      onClick={() => router.push(tile.href)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
      whileTap={{ y: 2 }}
      className="relative flex w-full flex-col rounded-2xl p-5 text-left"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `3px solid ${styles.slabBorder}`,
        gap: 12,
      }}
    >
      {tile.count > 0 && (
        <span
          className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] text-white"
          style={{ backgroundColor: styles.slabBorder, fontWeight: 700 }}
        >
          {tile.count}
        </span>
      )}
      <div
        className="flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: styles.badgeBg,
        }}
      >
        <Icon className="size-5" style={{ color: styles.iconStroke }} />
      </div>
      <div
        style={{
          borderTop: "1px solid var(--roost-border)",
          paddingTop: 12,
        }}
      >
        <p className="text-[15px] leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}>
          {tile.label}
        </p>
        <p
          className="mt-0.5 text-xs"
          style={{
            color: isExpensesPremiumText ? "#15803D" : "var(--roost-text-muted)",
            fontWeight: isExpensesPremiumText ? 500 : 600,
          }}
        >
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
          style={{ color: "#EF4444", fontWeight: 700 }}
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
              style={{ color: "#EF4444", fontWeight: 700 }}
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
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const {
    data: dashboardSummary,
    isLoading,
    isError,
    refetch,
  } = useQuery<DashboardSummaryResponse>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/summary");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load dashboard");
      }
      return r.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className="py-4 pb-24 md:py-6" style={{ backgroundColor: "var(--roost-bg)" }}>
        <PageContainer>
          <ErrorState onRetry={refetch} />
        </PageContainer>
      </div>
    );
  }

  // Guard: user has no household yet
  if (!dashboardSummary?.household) {
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

  const {
    activity,
    activityHasMore,
    dueReminderCount,
    hasSeenWelcome,
    isPremium,
    myBalance,
    role,
    tonightMealName,
  } = dashboardSummary;

  const activityItems = activity.map(mapActivity);

  function expensesStatusText(): string {
    if (!isPremium) return "Premium feature";
    const bal = myBalance;
    if (bal > 0.01) return `Owed $${bal.toFixed(2)}`;
    if (bal < -0.01) return `You owe $${Math.abs(bal).toFixed(2)}`;
    return "All settled";
  }

  function remindersStatusText(): string {
    if (dueReminderCount === 0) return "Nothing due today";
    if (dueReminderCount === 1) return "1 due today";
    return `${dueReminderCount} due today`;
  }

  function mealsStatusText(): string {
    if (tonightMealName) {
      return `Tonight: ${tonightMealName}`;
    }
    return "Nothing planned tonight";
  }

  const tiles = TILES.map((t) => {
    if (t.key === "expenses") return { ...t, statusText: expensesStatusText() };
    if (t.key === "meals") return { ...t, statusText: mealsStatusText() };
    if (t.key === "reminders") return { ...t, statusText: remindersStatusText() };
    return t;
  });

  const showWelcome =
    !welcomeDismissed &&
    hasSeenWelcome === false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      {showWelcome && (
        <WelcomeModal onDismiss={() => setWelcomeDismissed(true)} />
      )}
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
            <p className="mt-0.5 text-[13px]" style={{ color: "#7A756F", fontWeight: 600 }}>
              {formatDate()}
            </p>
          </div>
        )}

        {role === "admin" && <HouseholdJoinRequestsCard compact />}

        {/* Feature tiles grid */}
        <div data-testid="dashboard-tiles" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile, i) => (
            <TileCard key={tile.key} tile={tile} index={i} isPremium={isPremium} />
          ))}
        </div>

        {/* Rewards widget — child accounts only */}
        {role === "child" && <RewardsWidget />}

        {/* Recent Activity */}
        <div className="mb-4">
          <ActivityFeed
            items={activityItems}
            hasMore={activityHasMore}
            onSeeAll={() => router.push("/activity")}
          />
        </div>
      </PageContainer>
    </motion.div>
  );
}
