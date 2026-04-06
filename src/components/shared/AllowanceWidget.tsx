"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";

const COLOR = "#22C55E";
const COLOR_DARK = "#159040";

// ---- Types ------------------------------------------------------------------

interface AllowanceSetting {
  weekly_amount: string;
  threshold_percent: number;
}

interface AllowancePayout {
  id: string;
  week_start: string;
  amount: string;
  earned: boolean;
  completion_rate: number;
}

interface CurrentWeek {
  total: number;
  completed: number;
  completionRate: number;
  onTrack: boolean;
  projectedAmount: number;
}

interface AllowanceChildResponse {
  settings: AllowanceSetting | null;
  payouts: AllowancePayout[];
  currentWeek: CurrentWeek | null;
}

// ---- Helpers ----------------------------------------------------------------

function weekLabel(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = addDays(start, 6);
  return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
}

// ---- Widget -----------------------------------------------------------------

export default function AllowanceWidget() {
  const { data, isLoading } = useQuery<AllowanceChildResponse>({
    queryKey: ["allowance-child"],
    queryFn: async () => {
      const r = await fetch("/api/allowances/child");
      if (!r.ok) return { settings: null, payouts: [], currentWeek: null };
      return r.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  if (!data?.settings) return null;

  const { settings, payouts, currentWeek } = data;
  const weeklyAmount = parseFloat(settings.weekly_amount);
  const threshold = settings.threshold_percent;

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
        <PiggyBank className="size-5" style={{ color: COLOR }} />
        <p className="flex-1 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          My Allowance
        </p>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs"
          style={{
            backgroundColor: `${COLOR}18`,
            border: `1px solid ${COLOR}30`,
            color: COLOR,
            fontWeight: 700,
          }}
        >
          ${weeklyAmount.toFixed(2)}/week
        </span>
      </div>

      {/* Current week progress */}
      {currentWeek && (
        <div className="mb-4">
          <p className="mb-2 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            This week&apos;s progress
          </p>

          {/* Progress bar */}
          <div
            className="mb-2 h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--roost-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(currentWeek.completionRate, 100)}%`,
                backgroundColor: COLOR,
              }}
            />
          </div>

          {/* Stats */}
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}>
              {currentWeek.completed} of {currentWeek.total} chores done
            </span>
            <span className="text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}>
              {currentWeek.completionRate}%
            </span>
          </div>

          {/* Status message */}
          <p
            className="text-xs"
            style={{
              fontWeight: 700,
              color:
                currentWeek.onTrack
                  ? COLOR
                  : "#F59E0B",
            }}
          >
            {currentWeek.onTrack && currentWeek.completionRate >= 100
              ? "All done. You earned it."
              : currentWeek.onTrack
              ? `On track to earn $${weeklyAmount.toFixed(2)}`
              : `Need ${threshold}% to earn your allowance. Keep going.`}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="mb-3" style={{ height: 1, backgroundColor: "var(--roost-border)" }} />

      {/* Recent history */}
      <p className="mb-2 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
        Recent weeks
      </p>

      {payouts.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
          Your first allowance will be evaluated on Sunday.
        </p>
      ) : (
        <div className="space-y-2">
          {payouts.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                {weekLabel(p.week_start)}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    backgroundColor: p.earned ? `${COLOR}18` : "#EF444418",
                    color: p.earned ? COLOR : "#EF4444",
                    fontWeight: 700,
                    border: `1px solid ${p.earned ? COLOR + "30" : "#EF444430"}`,
                  }}
                >
                  {p.earned ? `$${parseFloat(p.amount).toFixed(2)} earned` : "Missed"}
                </span>
                <span className="text-[11px]" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  {p.completion_rate}% done
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
