"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/shared/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SECTION_COLORS, type SectionKey } from "@/lib/constants/colors";

// ---- Types ------------------------------------------------------------------

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

// ---- Helpers ----------------------------------------------------------------

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

function abbrev(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const PAGE_SIZE = 20;

// ---- Page -------------------------------------------------------------------

export default function ActivityPage() {
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<ActivityAPIItem[]>([]);

  const { data, isLoading, isError, refetch } = useQuery<ActivityResponse>({
    queryKey: ["activity-full", offset],
    queryFn: async () => {
      const r = await fetch(`/api/household/activity?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load activity");
      }
      const result: ActivityResponse = await r.json();
      if (offset === 0) {
        setAllItems(result.activity);
      } else {
        setAllItems((prev) => [...prev, ...result.activity]);
      }
      return result;
    },
    staleTime: 10_000,
    retry: 2,
  });

  function loadMore() {
    setOffset((prev) => prev + PAGE_SIZE);
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
        <PageHeader title="Activity" />

        {isLoading && offset === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        )}

        {isError && <ErrorState onRetry={refetch} />}

        {!isLoading && !isError && allItems.length === 0 && (
          <EmptyState
            icon={Activity}
            title="Nothing yet."
            body="Your household activity will appear here as people use the app."
            color="var(--roost-text-secondary)"
          />
        )}

        {allItems.length > 0 && (
          <>
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "4px solid #E5E7EB",
              }}
            >
              {allItems.map((item, i) => {
                const section = (TYPE_TO_SECTION[item.type] ?? "tasks") as SectionKey;
                const color = SECTION_COLORS[section];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.15 }}
                    className="flex min-h-14 items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? "1px solid var(--roost-border)" : undefined }}
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
                      style={{ backgroundColor: color, fontWeight: 700 }}
                    >
                      {abbrev(item.user_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}>
                        <span style={{ fontWeight: 700 }}>{item.user_name}</span>{" "}{item.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {data?.hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="flex h-11 items-center rounded-xl px-6 text-sm"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid #E5E7EB",
                    color: "var(--roost-text-primary)",
                    fontWeight: 700,
                  }}
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </motion.div>
  );
}
