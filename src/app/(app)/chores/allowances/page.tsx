"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PiggyBank, ArrowLeft, Baby } from "lucide-react";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { PageContainer } from "@/components/layout/PageContainer";
import { AllowanceChildCard, type AllowanceSetting, type ChildMember } from "@/components/allowances/AllowanceChildCard";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/shared/EmptyState";

const COLOR = "#EF4444";

// ---- Types ------------------------------------------------------------------

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  name: string;
  avatarColor: string;
  email: string;
  joinedAt: string;
  expiresAt: string | null;
}

interface MembersResponse {
  household: { name: string; subscriptionStatus: string };
  members: MemberItem[];
}

interface AllowanceData {
  allowance: AllowanceSetting | null;
}

interface ProgressData {
  settings: AllowanceSetting | null;
  currentWeek: {
    total: number;
    completed: number;
    completionRate: number;
    onTrack: boolean;
    projectedAmount: number;
  } | null;
}

const EVAL_DAYS = [
  { label: "Mon", value: "monday" },
  { label: "Tue", value: "tuesday" },
  { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" },
  { label: "Fri", value: "friday" },
  { label: "Sat", value: "saturday" },
  { label: "Sun", value: "sunday" },
];

const DEFAULT_EVAL_KEY = "roost_default_eval_day";

// ---- Page -------------------------------------------------------------------

export default function AllowancesPage() {
  const router = useRouter();
  const { isPremium, role, isLoading: householdLoading } = useHousehold();

  // Redirect non-premium or non-admin
  useEffect(() => {
    if (householdLoading) return;
    if (isPremium === false || role === "child") {
      router.replace("/chores");
    }
  }, [isPremium, role, householdLoading, router]);

  // Default evaluation day (localStorage)
  const [defaultEvalDay, setDefaultEvalDay] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DEFAULT_EVAL_KEY) ?? "sunday";
    }
    return "sunday";
  });

  function handleSetDefaultDay(day: string) {
    setDefaultEvalDay(day);
    localStorage.setItem(DEFAULT_EVAL_KEY, day);
  }

  // Fetch members
  const { data: membersData, isLoading: membersLoading } = useQuery<MembersResponse>({
    queryKey: ["members"],
    queryFn: async () => {
      const r = await fetch("/api/household/members");
      if (!r.ok) throw new Error("Failed to load members");
      return r.json();
    },
    staleTime: 30_000,
  });

  const children = membersData?.members.filter((m) => m.role === "child") ?? [];

  // Fetch allowance settings for each child
  const allowanceQueries = useQuery({
    queryKey: ["allowances-all", children.map((c) => c.id).join(",")],
    queryFn: async () => {
      if (children.length === 0) return {};
      const results: Record<string, AllowanceSetting | null> = {};
      await Promise.all(
        children.map(async (child) => {
          const r = await fetch(`/api/household/members/${child.id}/allowance`);
          if (!r.ok) { results[child.id] = null; return; }
          const data: AllowanceData = await r.json();
          results[child.id] = data.allowance;
        })
      );
      return results;
    },
    enabled: children.length > 0,
    staleTime: 30_000,
  });

  // Fetch current week progress for each child
  const progressQueries = useQuery({
    queryKey: ["allowance-progress-all", children.map((c) => c.userId).join(",")],
    queryFn: async () => {
      if (children.length === 0) return {};
      const results: Record<string, ProgressData["currentWeek"]> = {};
      await Promise.all(
        children.map(async (child) => {
          const r = await fetch(`/api/allowances/child-progress?userId=${child.userId}`);
          if (!r.ok) { results[child.userId] = null; return; }
          const data: ProgressData = await r.json();
          results[child.userId] = data.currentWeek;
        })
      );
      return results;
    },
    enabled: children.length > 0,
    staleTime: 30_000,
  });

  const isLoading = membersLoading || allowanceQueries.isLoading || progressQueries.isLoading;

  if (householdLoading || (isPremium === false) || role === "child") {
    return null;
  }

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="py-6 px-4 md:px-0"
      >
        {/* Back nav */}
        <button
          onClick={() => router.back()}
          className="mb-5 flex items-center gap-1.5 text-sm"
          style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
        >
          <ArrowLeft className="size-4" />
          Back to chores
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl shrink-0"
            style={{
              backgroundColor: `${COLOR}18`,
              border: "1.5px solid var(--roost-border)",
              borderBottom: `4px solid ${COLOR}`,
            }}
          >
            <PiggyBank className="size-5" style={{ color: COLOR }} />
          </div>
          <div>
            <h1 className="text-xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              Allowances
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Set weekly allowances tied to chore completion for your kids.
            </p>
          </div>
        </div>

        {/* Default evaluation day card */}
        <div
          className="mb-6 rounded-2xl p-4"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "4px solid var(--roost-border-bottom)",
          }}
        >
          <p className="mb-3 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Default evaluation day
          </p>
          <p className="mb-3 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            The day of the week chore completion is evaluated. Used as the default for new children.
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {EVAL_DAYS.map((d) => (
              <motion.button
                key={d.value}
                whileTap={{ y: 1 }}
                type="button"
                onClick={() => handleSetDefaultDay(d.value)}
                className="rounded-xl px-3 py-1.5 text-xs"
                style={{
                  fontWeight: 700,
                  backgroundColor: defaultEvalDay === d.value ? COLOR : "var(--roost-bg)",
                  color: defaultEvalDay === d.value ? "#fff" : "var(--roost-text-secondary)",
                  border: defaultEvalDay === d.value
                    ? `1.5px solid ${COLOR}`
                    : "1.5px solid var(--roost-border)",
                  borderBottom: defaultEvalDay === d.value
                    ? "3px solid #C93B3B"
                    : "3px solid var(--roost-border-bottom)",
                }}
              >
                {d.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Children section */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        ) : children.length === 0 ? (
          <EmptyState
            icon={Baby}
            color={COLOR}
            title="No child accounts yet."
            body="Add child accounts in Settings to set up allowances for your kids."
            buttonLabel="Go to Settings"
            onButtonClick={() => router.push("/settings")}
          />
        ) : (
          <div className="space-y-4">
            {children.map((child, i) => {
              const childMember: ChildMember = {
                id: child.id,
                userId: child.userId,
                name: child.name,
                avatarColor: child.avatarColor,
              };
              const allowance = allowanceQueries.data?.[child.id] ?? null;
              const progress = progressQueries.data?.[child.userId] ?? null;

              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
                >
                  <AllowanceChildCard
                    member={childMember}
                    allowance={allowance}
                    currentWeek={progress}
                    defaultEvalDay={defaultEvalDay}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </PageContainer>
  );
}
