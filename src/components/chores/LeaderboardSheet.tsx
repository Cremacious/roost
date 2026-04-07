"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.chores;

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

const RANK_COLORS: Record<number, { text: string; bg: string; border: string }> = {
  0: { text: "#F59E0B", bg: "#F59E0B18", border: "#F59E0B40" }, // gold
  1: { text: "#9CA3AF", bg: "#9CA3AF18", border: "#9CA3AF40" }, // silver
  2: { text: "#B45309", bg: "#B4530918", border: "#B4530940" }, // bronze
};

const RANK_LABELS = ["1st", "2nd", "3rd"];

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
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4"
        style={{ backgroundColor: "var(--roost-bg)" }}
      >
        <SheetHeader className="mb-5">
          <SheetTitle
            className="text-lg"
            style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
          >
            Weekly Leaderboard
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div
            className="flex items-center justify-center py-12 text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            Loading...
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p
              className="text-sm"
              style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}
            >
              No activity this week yet.
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
            >
              Complete chores to earn points and claim your spot.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isMe = entry.userId === currentUserId;
            const rank = RANK_COLORS[i];
            const rankLabel = i < 3 ? RANK_LABELS[i] : `${i + 1}th`;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.15 }}
                className="flex min-h-16 items-center gap-3 rounded-2xl px-4"
                style={{
                  backgroundColor: isMe ? COLOR + "10" : "var(--roost-surface)",
                  border: isMe
                    ? `1.5px solid ${COLOR}30`
                    : "1.5px solid var(--roost-border)",
                  borderBottom: isMe
                    ? `4px solid ${COLOR}40`
                    : rank
                    ? `4px solid ${rank.border}`
                    : "4px solid #C93B3B",
                }}
              >
                {/* Rank badge */}
                <div
                  className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg text-xs"
                  style={
                    rank
                      ? {
                          backgroundColor: rank.bg,
                          border: `1px solid ${rank.border}`,
                          color: rank.text,
                          fontWeight: 800,
                        }
                      : {
                          backgroundColor: "var(--roost-bg)",
                          border: "1px solid var(--roost-border)",
                          color: "var(--roost-text-muted)",
                          fontWeight: 700,
                        }
                  }
                >
                  {rankLabel}
                </div>

                {/* Avatar */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs text-white"
                  style={{
                    backgroundColor: entry.avatarColor ?? COLOR,
                    fontWeight: 700,
                  }}
                >
                  {initials(entry.name)}
                </div>

                {/* Name + streak */}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm"
                    style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
                  >
                    {entry.name}
                    {isMe && (
                      <span
                        className="ml-2 text-xs"
                        style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                      >
                        you
                      </span>
                    )}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                  >
                    {entry.currentStreak > 0
                      ? `${entry.currentStreak} day streak`
                      : "No streak yet"}
                  </p>
                </div>

                {/* Points */}
                <div className="shrink-0 text-right">
                  <p
                    className="text-base tabular-nums"
                    style={{ color: COLOR, fontWeight: 800 }}
                  >
                    {entry.points}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                  >
                    pts
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
