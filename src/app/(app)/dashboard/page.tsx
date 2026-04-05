"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  FileText,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SECTION_COLORS, type SectionKey } from "@/lib/constants/colors";

// ---- Types ------------------------------------------------------------------

interface Member {
  id: string;
  userId: string;
  name: string;
  avatarColor: string | null;
}

interface MembersResponse {
  household: { id: string; name: string; subscriptionStatus: string };
  members: Member[];
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

// ---- Constants --------------------------------------------------------------

// TODO: Replace with real data from API once features are built
const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", section: "chores",   memberName: "Alex",   action: "completed dishes",          timestamp: new Date(Date.now() - 2 * 60_000) },
  { id: "2", section: "grocery",  memberName: "Jordan", action: "added milk to grocery list", timestamp: new Date(Date.now() - 15 * 60_000) },
  { id: "3", section: "tasks",    memberName: "Sam",    action: "completed a task",           timestamp: new Date(Date.now() - 1 * 3600_000) },
  { id: "4", section: "calendar", memberName: "Alex",   action: "added dinner event",         timestamp: new Date(Date.now() - 3 * 3600_000) },
  { id: "5", section: "expenses", memberName: "Jordan", action: "added $42 grocery expense",  timestamp: new Date(Date.now() - 5 * 3600_000) },
  { id: "6", section: "chores",   memberName: "Sam",    action: "completed vacuuming",        timestamp: new Date(Date.now() - 24 * 3600_000) },
];

// TODO: Replace counts with real API data once features are built
const TILES: Tile[] = [
  { key: "chores",    label: "Chores",    href: "/chores",    icon: CheckSquare,     count: 3,  statusText: "3 left today" },
  { key: "grocery",   label: "Grocery",   href: "/grocery",   icon: ShoppingCart,    count: 12, statusText: "12 items" },
  { key: "calendar",  label: "Calendar",  href: "/calendar",  icon: Calendar,        count: 2,  statusText: "2 events today" },
  { key: "expenses",  label: "Expenses",  href: "/expenses",  icon: DollarSign,      count: 0,  statusText: "All settled" },
  { key: "tasks",     label: "Tasks",     href: "/tasks",     icon: CheckCircle2,    count: 4,  statusText: "4 open" },
  { key: "notes",     label: "Notes",     href: "/notes",     icon: FileText,        count: 0,  statusText: "No notes yet" },
  { key: "meals",     label: "Meals",     href: "/meals",     icon: UtensilsCrossed, count: 0,  statusText: "Plan this week" },
  { key: "reminders", label: "Reminders", href: "/reminders", icon: Bell,            count: 1,  statusText: "1 upcoming" },
];

// ---- Sub-components ---------------------------------------------------------

function TileCard({ tile }: { tile: Tile }) {
  const router = useRouter();
  const color = SECTION_COLORS[tile.key];
  const Icon = tile.icon;

  return (
    <button
      type="button"
      onClick={() => router.push(tile.href)}
      className="relative flex min-h-24 md:min-h-[120px] w-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ backgroundColor: color }}
      />

      {/* Badge */}
      {tile.count > 0 && (
        <span
          className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {tile.count}
        </span>
      )}

      {/* Icon */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: color + "1a" }}
      >
        <Icon className="size-4" style={{ color }} />
      </div>

      {/* Text */}
      <div>
        <p className="text-[15px] font-medium leading-tight">{tile.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{tile.statusText}</p>
      </div>
    </button>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-0">
      <h2 className="mb-3 text-base font-semibold">Recent Activity</h2>
      <div className="divide-y divide-border rounded-xl border border-border">
        {items.map((item) => {
          const color = SECTION_COLORS[item.section];
          const initials = item.memberName
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();
          return (
            <div
              key={item.id}
              className="flex min-h-[48px] items-center gap-3 px-4 py-3"
            >
              {/* Section dot */}
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              {/* Avatar */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-medium">{item.memberName}</span>{" "}
                  {item.action}
                </p>
              </div>
              {/* Time */}
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function DashboardPage() {
  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: () => fetch("/api/household/members").then((r) => r.json()),
    staleTime: 60_000,
    retry: false,
  });

  const householdName = membersData?.household.name ?? "";

  return (
    <div className="flex flex-col gap-6 p-4 md:flex-row md:items-start md:p-6">
      {/* Left / main column */}
      <div className="min-w-0 flex-1 space-y-6">
        {householdName && (
          <h1 className="text-xl font-bold md:text-2xl">{householdName}</h1>
        )}

        {/* Tile grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {TILES.map((tile) => (
            <TileCard key={tile.key} tile={tile} />
          ))}
        </div>

        {/* Activity feed — mobile only (shows below tiles) */}
        <div className="lg:hidden">
          <ActivityFeed items={MOCK_ACTIVITY} />
        </div>
      </div>

      {/* Right column — activity feed on desktop */}
      <div className="hidden w-80 shrink-0 lg:block">
        <ActivityFeed items={MOCK_ACTIVITY} />
      </div>
    </div>
  );
}
