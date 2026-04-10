"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
  subDays,
} from "date-fns";
import { ArrowLeft, CheckCircle2, ClipboardX } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import MemberAvatar from "@/components/shared/MemberAvatar";
import StatCard from "@/components/shared/StatCard";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.chores;
const COLOR_DARK = "#C93B3B";
const PAGE_SIZE = 50;

// ---- Types ------------------------------------------------------------------

interface Completion {
  id: string;
  choreTitle: string;
  completedAt: string;
  member: {
    id: string;
    name: string;
    avatarColor: string | null;
  };
  pointsEarned: number;
}

interface HistoryResponse {
  completions: Completion[];
  total: number;
  hasMore: boolean;
  stats: {
    mostActiveMember: { name: string; completionCount: number } | null;
    streakLeader: { name: string; currentStreak: number } | null;
  };
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

function defaultFrom(): string {
  return format(subDays(new Date(), 30), "yyyy-MM-dd");
}

function defaultTo(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function dateGroupLabel(isoStr: string): string {
  const d = parseISO(isoStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE MMM d");
}

function completionTimeLabel(isoStr: string): string {
  const d = parseISO(isoStr);
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

// ---- Page -------------------------------------------------------------------

export default function ChoreHistoryPage() {
  const router = useRouter();
  const { isPremium, isLoading: householdLoading } = useHousehold();

  const [selectedMember, setSelectedMember] = useState("all");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [offset, setOffset] = useState(0);
  const [allCompletions, setAllCompletions] = useState<Completion[]>([]);
  const [lastStats, setLastStats] = useState<HistoryResponse["stats"] | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Members for filter pills
  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const r = await fetch("/api/household/members");
      if (!r.ok) throw new Error("Failed to load members");
      return r.json();
    },
    staleTime: 60_000,
  });

  // History query
  const { isLoading, isFetching, isError } = useQuery<HistoryResponse>({
    queryKey: ["chore-history", selectedMember, fromDate, toDate, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        member: selectedMember,
        from: fromDate,
        to: toDate,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const r = await fetch(`/api/chores/history?${params}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load history");
      }
      const result: HistoryResponse = await r.json();
      if (offset === 0) {
        setAllCompletions(result.completions);
      } else {
        setAllCompletions((prev) => [...prev, ...result.completions]);
      }
      setLastStats(result.stats);
      setTotalCount(result.total);
      return result;
    },
    staleTime: 30_000,
    enabled: isPremium === true,
  });

  function applyMemberFilter(userId: string) {
    setSelectedMember(userId);
    setOffset(0);
    setAllCompletions([]);
  }

  function applyDateFilter(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
    setOffset(0);
    setAllCompletions([]);
  }

  function resetDates() {
    applyDateFilter(defaultFrom(), defaultTo());
  }

  function loadMore() {
    setOffset((prev) => prev + PAGE_SIZE);
  }

  const members = membersData?.members ?? [];

  // Group completions by date
  const groups: { label: string; dateKey: string; items: Completion[] }[] = [];
  let lastKey = "";
  for (const c of allCompletions) {
    const dateKey = c.completedAt.slice(0, 10);
    if (dateKey !== lastKey) {
      lastKey = dateKey;
      groups.push({ label: dateGroupLabel(c.completedAt), dateKey, items: [] });
    }
    groups[groups.length - 1].items.push(c);
  }

  const isFirstLoad = isLoading && offset === 0;
  const hasMore = allCompletions.length < totalCount;

  // ---- Premium gate --------------------------------------------------------

  if (householdLoading) {
    return (
      <div className="py-4 pb-24 md:py-6" style={{ backgroundColor: "var(--roost-bg)" }}>
        <PageContainer className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-7 w-48 rounded-xl" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        </PageContainer>
      </div>
    );
  }

  // ---- Full page -----------------------------------------------------------

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
          <button
            type="button"
            onClick={() => router.push("/chores")}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
              color: "var(--roost-text-primary)",
            }}
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-2xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              Completion History
            </h1>
            <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Every chore completed by your household
            </p>
          </div>
        </div>

        {/* Member filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            type="button"
            onClick={() => applyMemberFilter("all")}
            className="flex h-8 shrink-0 items-center rounded-full px-3 text-xs transition-colors"
            style={{
              backgroundColor: selectedMember === "all" ? COLOR : "var(--roost-border)",
              color: selectedMember === "all" ? "white" : "var(--roost-text-secondary)",
              fontWeight: 700,
              border: "none",
            }}
          >
            Everyone
          </button>
          {members.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => applyMemberFilter(m.userId)}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full pl-1 pr-3 text-xs transition-colors"
              style={{
                backgroundColor: selectedMember === m.userId ? COLOR : "var(--roost-border)",
                color: selectedMember === m.userId ? "white" : "var(--roost-text-secondary)",
                fontWeight: 700,
                border: "none",
              }}
            >
              <MemberAvatar name={m.name} avatarColor={m.avatarColor} size="sm" />
              {m.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div
          className="flex flex-wrap items-end gap-3 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "4px solid var(--roost-border-bottom)",
          }}
        >
          <div className="flex flex-1 flex-col gap-1 min-w-[130px]">
            <label className="text-xs" style={{ color: "#374151", fontWeight: 700 }}>
              From
            </label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => applyDateFilter(e.target.value, toDate)}
              className="h-9 rounded-xl px-3 text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: `2px solid ${COLOR}`,
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1 min-w-[130px]">
            <label className="text-xs" style={{ color: "#374151", fontWeight: 700 }}>
              To
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => applyDateFilter(fromDate, e.target.value)}
              className="h-9 rounded-xl px-3 text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: `2px solid ${COLOR}`,
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            />
          </div>
          <button
            type="button"
            onClick={resetDates}
            className="h-9 shrink-0 rounded-xl px-3 text-xs"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: "2px solid var(--roost-border-bottom)",
              color: "var(--roost-text-muted)",
              fontWeight: 700,
              backgroundColor: "var(--roost-surface)",
            }}
          >
            Reset
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            value={totalCount}
            label="Completions"
            color={COLOR}
            borderColor={COLOR_DARK}
          />
          <StatCard
            value={lastStats?.mostActiveMember?.name?.split(" ")[0] ?? "--"}
            label="Most active"
            borderColor={COLOR_DARK}
          />
          <StatCard
            value={
              lastStats?.streakLeader
                ? `${lastStats.streakLeader.currentStreak}d`
                : "--"
            }
            label={
              lastStats?.streakLeader
                ? `${lastStats.streakLeader.name.split(" ")[0]} streak`
                : "Streak leader"
            }
            color="#F59E0B"
            borderColor={COLOR_DARK}
          />
        </div>

        {/* Loading skeleton */}
        {isFirstLoad && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && !isFirstLoad && (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid #C93B3B",
              color: "var(--roost-text-secondary)",
              fontWeight: 600,
            }}
          >
            Could not load history. Check your connection and try again.
          </div>
        )}

        {/* Empty state */}
        {!isFirstLoad && !isError && allCompletions.length === 0 && (
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
                borderBottom: `4px solid ${COLOR_DARK}`,
              }}
            >
              <ClipboardX className="size-7" style={{ color: COLOR }} />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                No completions found
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                Try adjusting your filters or date range.
              </p>
            </div>
          </motion.div>
        )}

        {/* Completion list grouped by date */}
        {!isFirstLoad && groups.length > 0 && (
          <div className="space-y-1">
            {groups.map(({ label, dateKey, items }) => (
              <div key={dateKey}>
                {/* Date separator */}
                <p
                  className="px-1 pb-1 pt-3 text-xs first:pt-0"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                >
                  {label}
                </p>

                {/* Rows */}
                <div className="space-y-1.5">
                  {items.map((completion, i) => (
                    <motion.div
                      key={completion.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.15), duration: 0.13 }}
                      className="flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2"
                      style={{
                        backgroundColor: "var(--roost-surface)",
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: `4px solid ${COLOR_DARK}`,
                      }}
                    >
                      {/* Icon circle */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${COLOR}18` }}
                      >
                        <CheckCircle2 className="size-5" style={{ color: COLOR }} strokeWidth={2} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm"
                          style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
                        >
                          {completion.choreTitle}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <MemberAvatar
                            name={completion.member.name}
                            avatarColor={completion.member.avatarColor}
                            size="sm"
                          />
                          <span
                            className="text-xs"
                            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                          >
                            {completion.member.name.split(" ")[0]}
                          </span>
                        </div>
                      </div>

                      {/* Right: time + points */}
                      <div className="shrink-0 text-right">
                        <p
                          className="text-xs"
                          style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                        >
                          {completionTimeLabel(completion.completedAt)}
                        </p>
                        <p
                          className="mt-0.5 text-[11px]"
                          style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                        >
                          +{completion.pointsEarned} pts
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !isFirstLoad && (
          <div className="flex justify-center pb-2">
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={loadMore}
              disabled={isFetching}
              className="flex h-11 items-center rounded-xl px-6 text-sm"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
                opacity: isFetching ? 0.6 : 1,
              }}
            >
              {isFetching ? "Loading..." : "Load more"}
            </motion.button>
          </div>
        )}

      </PageContainer>
    </motion.div>
  );
}
