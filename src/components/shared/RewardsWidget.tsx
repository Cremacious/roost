"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { format, parseISO, addDays } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";

const COLOR = "#EF4444";
const COLOR_DARK = "#B91C1C";

// ---- Types ------------------------------------------------------------------

interface CurrentPeriod {
  start: string;
  end: string;
  total: number;
  completed: number;
  completionRate: number;
  onTrack: boolean;
}

interface RewardRuleWithProgress {
  id: string;
  title: string;
  reward_type: string;
  reward_description: string | null;
  reward_amount: string | null;
  period_type: string;
  period_days: number | null;
  threshold_percent: number;
  enabled: boolean;
  currentPeriod: CurrentPeriod;
}

interface RewardPayout {
  id: string;
  rule_id: string | null;
  period_start: string;
  period_end: string;
  reward_type: string;
  reward_description: string | null;
  reward_amount: string | null;
  earned: boolean;
  completion_rate: number;
  acknowledged: boolean;
}

interface RewardsChildResponse {
  rules: RewardRuleWithProgress[];
  payouts: RewardPayout[];
}

// ---- Helpers ----------------------------------------------------------------

function periodLabel(periodType: string, periodDays: number | null): string {
  if (periodType === "week") return "Weekly";
  if (periodType === "month") return "Monthly";
  if (periodType === "year") return "Yearly";
  return `Every ${periodDays ?? "?"} days`;
}

function rewardLabel(rule: RewardRuleWithProgress): string {
  if (rule.reward_type === "money" && rule.reward_amount) {
    return `$${parseFloat(rule.reward_amount).toFixed(2)}`;
  }
  return rule.reward_description ?? rule.title;
}

function payoutLabel(payout: RewardPayout): string {
  if (payout.reward_type === "money" && payout.reward_amount) {
    return `$${parseFloat(payout.reward_amount).toFixed(2)} earned`;
  }
  return payout.reward_description ?? "Reward earned";
}

// ---- Widget -----------------------------------------------------------------

export default function RewardsWidget() {
  const { isPremium } = useHousehold();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<RewardsChildResponse>({
    queryKey: ["rewards-child"],
    queryFn: async () => {
      const r = await fetch("/api/rewards/child");
      if (!r.ok) return { rules: [], payouts: [] };
      return r.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const r = await fetch(`/api/rewards/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged: true }),
      });
      if (!r.ok) throw new Error("Failed to claim reward");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards-child"] });
      // TODO: trigger push notification to parent when Expo app is built
    },
    onError: () => {
      toast.error("Could not claim reward", {
        description: "Try again in a moment.",
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  if (isPremium === false) return null;
  if (isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  const rules = data?.rules ?? [];
  const payouts = data?.payouts ?? [];

  // Only show if there are active rules
  if (rules.length === 0) return null;

  // Unacknowledged earned payouts
  const pendingClaims = payouts.filter((p) => p.earned && !p.acknowledged);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `4px solid ${COLOR_DARK}`,
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="size-5" style={{ color: COLOR }} />
        <p
          className="flex-1 text-sm"
          style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
        >
          My Rewards
        </p>
      </div>

      {/* Pending claims */}
      {pendingClaims.map((payout) => (
        <div
          key={payout.id}
          className="mb-3 rounded-xl p-3"
          style={{
            backgroundColor: "#22C55E12",
            border: "1.5px solid #22C55E30",
            borderBottom: "3px solid #15903040",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="size-4" style={{ color: "#22C55E" }} />
            <p
              className="text-sm"
              style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
            >
              Reward earned!
            </p>
          </div>
          <p
            className="mb-2 text-xs"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            {payoutLabel(payout)}
          </p>
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => acknowledgeMutation.mutate(payout.id)}
            disabled={acknowledgeMutation.isPending}
            className="flex h-8 items-center justify-center rounded-lg px-4 text-xs text-white disabled:opacity-50"
            style={{
              backgroundColor: "#22C55E",
              border: "1.5px solid #22C55E",
              borderBottom: "3px solid #159040",
              fontWeight: 700,
            }}
          >
            Claim reward
          </motion.button>
        </div>
      ))}

      {/* Active rules with progress */}
      <div className="space-y-4">
        {rules.map((rule) => {
          const { currentPeriod } = rule;
          return (
            <div key={rule.id}>
              {/* Rule title + badges */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <p
                  className="w-full text-xs"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
                >
                  {rule.title}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    backgroundColor: "#EF444418",
                    border: "1px solid #EF444430",
                    color: COLOR,
                    fontWeight: 700,
                  }}
                >
                  {periodLabel(rule.period_type, rule.period_days)}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    backgroundColor: "var(--roost-bg)",
                    border: "1px solid var(--roost-border)",
                    color: "var(--roost-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  {rewardLabel(rule)}
                </span>
              </div>

              {/* Progress bar */}
              {currentPeriod && (
                <>
                  <div
                    className="mb-1.5 h-2 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--roost-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(currentPeriod.completionRate, 100)}%`,
                        backgroundColor: "#22C55E",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className="text-xs"
                      style={{
                        fontWeight: 700,
                        color: currentPeriod.onTrack ? "#22C55E" : "#F59E0B",
                      }}
                    >
                      {currentPeriod.onTrack
                        ? "On track!"
                        : `${currentPeriod.completionRate}% done, need ${rule.threshold_percent}%`}
                    </p>
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--roost-text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {currentPeriod.completed}/{currentPeriod.total} chores
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider + recent history */}
      {payouts.length > 0 && (
        <>
          <div
            className="my-3"
            style={{ height: 1, backgroundColor: "var(--roost-border)" }}
          />
          <p
            className="mb-2 text-xs"
            style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
          >
            Recent
          </p>
          <div className="space-y-2">
            {payouts.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span
                  className="text-xs"
                  style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
                >
                  {format(parseISO(p.period_start), "MMM d")} -{" "}
                  {format(addDays(parseISO(p.period_start), 6), "MMM d")}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    backgroundColor: p.earned ? "#22C55E18" : "#EF444418",
                    color: p.earned ? "#22C55E" : "#EF4444",
                    fontWeight: 700,
                    border: `1px solid ${p.earned ? "#22C55E30" : "#EF444430"}`,
                  }}
                >
                  {p.earned ? payoutLabel(p) : "Missed"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
