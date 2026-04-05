"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ---- Types ------------------------------------------------------------------

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarColor: string | null;
  currentStreak: number;
  longestStreak: number;
  points: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  weekStart: string;
  currentUserId: string;
}

// ---- Helpers ----------------------------------------------------------------

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const RANK_COLORS: Record<number, string> = {
  0: "#F59E0B", // gold
  1: "#9CA3AF", // silver
  2: "#B45309", // bronze
};

// ---- Component --------------------------------------------------------------

interface LeaderboardSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function LeaderboardSheet({ open, onClose }: LeaderboardSheetProps) {
  const { data, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["chores-leaderboard"],
    queryFn: () => fetch("/api/chores/leaderboard").then((r) => r.json()),
    enabled: open,
    staleTime: 30_000,
  });

  const entries = data?.leaderboard ?? [];
  const currentUserId = data?.currentUserId;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4">
        <SheetHeader className="mb-4">
          <SheetTitle>Weekly Leaderboard</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No activity this week yet.</p>
            <p className="text-xs text-muted-foreground">Complete chores to earn points.</p>
          </div>
        )}

        <div className="space-y-1">
          {entries.map((entry, i) => {
            const isMe = entry.userId === currentUserId;
            const rankColor = RANK_COLORS[i];
            const rankLabel = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`;

            return (
              <div
                key={entry.userId}
                className={`flex min-h-[56px] items-center gap-3 rounded-xl px-3 ${
                  isMe ? "bg-[#EF4444]/8" : ""
                }`}
              >
                {/* Rank */}
                <span
                  className="w-8 text-center text-sm font-bold"
                  style={{ color: rankColor ?? "var(--muted-foreground)" }}
                >
                  {rankLabel}
                </span>

                {/* Avatar */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: entry.avatarColor ?? "#6366f1" }}
                >
                  {initials(entry.name)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.name}
                    {isMe && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.currentStreak > 0
                      ? `${entry.currentStreak} day streak`
                      : "No streak yet"}
                  </p>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p
                    className="text-base font-bold tabular-nums"
                    style={{ color: "#EF4444" }}
                  >
                    {entry.points}
                  </p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
