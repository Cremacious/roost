"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { PiggyBank, TrendingUp, TrendingDown } from "lucide-react";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { toast } from "sonner";

const COLOR = "#EF4444";
const COLOR_DARK = "#C93B3B";

const DAYS = [
  { label: "Mon", value: "monday" },
  { label: "Tue", value: "tuesday" },
  { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" },
  { label: "Fri", value: "friday" },
  { label: "Sat", value: "saturday" },
  { label: "Sun", value: "sunday" },
];

// ---- Types ------------------------------------------------------------------

export interface AllowanceSetting {
  enabled: boolean;
  weekly_amount: string;
  threshold_percent: number;
  evaluation_day: string;
}

interface CurrentWeek {
  total: number;
  completed: number;
  completionRate: number;
  onTrack: boolean;
  projectedAmount: number;
}

export interface ChildMember {
  id: string; // household_members.id
  userId: string;
  name: string;
  avatarColor: string;
}

interface AllowanceChildCardProps {
  member: ChildMember;
  allowance: AllowanceSetting | null;
  currentWeek: CurrentWeek | null;
  defaultEvalDay: string;
}

// ---- Component ---------------------------------------------------------------

export function AllowanceChildCard({
  member,
  allowance,
  currentWeek,
  defaultEvalDay,
}: AllowanceChildCardProps) {
  const qc = useQueryClient();

  const [enabled, setEnabled] = useState(allowance?.enabled ?? false);
  const [amount, setAmount] = useState(
    allowance ? parseFloat(allowance.weekly_amount).toFixed(2) : "5.00"
  );
  const [threshold, setThreshold] = useState(allowance?.threshold_percent ?? 80);
  const [evalDay, setEvalDay] = useState(
    allowance?.evaluation_day ?? defaultEvalDay
  );
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (patch: {
      enabled: boolean;
      weeklyAmount: number;
      thresholdPercent: number;
      evaluationDay: string;
    }) => {
      const r = await fetch(`/api/household/members/${member.id}/allowance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success("Allowance settings saved.");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: Error) => {
      toast.error("Could not save allowance settings.", { description: err.message });
    },
  });

  function handleSave() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid weekly amount.", {
        description: "Amount must be greater than $0.",
      });
      return;
    }
    saveMutation.mutate({
      enabled,
      weeklyAmount: parsed,
      thresholdPercent: threshold,
      evaluationDay: evalDay,
    });
  }

  function mark(fn: () => void) {
    fn();
    setDirty(true);
  }

  const weeklyAmount = parseFloat(amount) || 0;
  const hasChores = (currentWeek?.total ?? 0) > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `4px solid ${enabled ? COLOR_DARK : "var(--roost-border-bottom)"}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <MemberAvatar name={member.name} color={member.avatarColor} size="md" />
        <div className="flex-1 min-w-0">
          <p
            className="truncate text-sm"
            style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
          >
            {member.name}
          </p>
          {enabled && (
            <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              ${weeklyAmount.toFixed(2)}/week
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {enabled && (
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: `${COLOR}18`,
                border: `1px solid ${COLOR}30`,
                color: COLOR,
                fontWeight: 700,
              }}
            >
              Active
            </span>
          )}
          <Switch
            checked={enabled}
            onCheckedChange={(v) => mark(() => setEnabled(v))}
            style={{ "--primary": COLOR } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Progress bar (if active and has chores) */}
      {enabled && hasChores && currentWeek && (
        <div className="px-4 pb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              This week
            </span>
            <div className="flex items-center gap-1">
              {currentWeek.onTrack ? (
                <TrendingUp className="size-3" style={{ color: "#22C55E" }} />
              ) : (
                <TrendingDown className="size-3" style={{ color: "#F59E0B" }} />
              )}
              <span
                className="text-xs"
                style={{ color: currentWeek.onTrack ? "#22C55E" : "#F59E0B", fontWeight: 700 }}
              >
                {currentWeek.completionRate}%
              </span>
            </div>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--roost-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(currentWeek.completionRate, 100)}%`,
                backgroundColor: currentWeek.onTrack ? "#22C55E" : "#F59E0B",
              }}
            />
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            {currentWeek.completed} of {currentWeek.total} chores done
          </p>
        </div>
      )}

      {enabled && !hasChores && (
        <div className="px-4 pb-3">
          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            No chores assigned yet. Assign chores to track progress.
          </p>
        </div>
      )}

      {/* Settings (only when enabled) */}
      {enabled && (
        <div
          style={{ borderTop: "1px solid var(--roost-border)" }}
          className="px-4 pt-3 pb-4 space-y-4"
        >
          {/* Weekly amount */}
          <div>
            <label
              className="mb-1.5 block text-xs"
              style={{ color: "#374151", fontWeight: 700 }}
            >
              Weekly amount
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
              >
                $
              </span>
              <input
                type="number"
                min="0.01"
                step="0.50"
                value={amount}
                onChange={(e) => mark(() => setAmount(e.target.value))}
                className="w-full rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--roost-bg)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid var(--roost-border-bottom)",
                  color: "var(--roost-text-primary)",
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Threshold */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                className="text-xs"
                style={{ color: "#374151", fontWeight: 700 }}
              >
                Completion threshold
              </label>
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: `${COLOR}18`,
                  border: `1px solid ${COLOR}30`,
                  color: COLOR,
                  fontWeight: 800,
                }}
              >
                {threshold}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={threshold}
              onChange={(e) => mark(() => setThreshold(Number(e.target.value)))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                accentColor: COLOR,
                background: `linear-gradient(to right, ${COLOR} 0%, ${COLOR} ${((threshold - 50) / 50) * 100}%, var(--roost-border) ${((threshold - 50) / 50) * 100}%, var(--roost-border) 100%)`,
              }}
            />
            <div className="mt-1.5 flex justify-between">
              <span className="text-[11px]" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                50%
              </span>
              <span className="text-[11px]" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                100%
              </span>
            </div>
          </div>

          {/* Evaluation day */}
          <div>
            <label
              className="mb-2 block text-xs"
              style={{ color: "#374151", fontWeight: 700 }}
            >
              Evaluate on
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d) => (
                <motion.button
                  key={d.value}
                  whileTap={{ y: 1 }}
                  type="button"
                  onClick={() => mark(() => setEvalDay(d.value))}
                  className="rounded-xl px-3 py-1.5 text-xs"
                  style={{
                    fontWeight: 700,
                    backgroundColor: evalDay === d.value ? COLOR : "var(--roost-bg)",
                    color: evalDay === d.value ? "#fff" : "var(--roost-text-secondary)",
                    border: evalDay === d.value
                      ? `1.5px solid ${COLOR}`
                      : "1.5px solid var(--roost-border)",
                    borderBottom: evalDay === d.value
                      ? `3px solid ${COLOR_DARK}`
                      : "3px solid var(--roost-border-bottom)",
                  }}
                >
                  {d.label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      {dirty && (
        <div className="px-4 pb-4">
          <motion.button
            whileTap={{ y: 2 }}
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full rounded-xl py-2.5 text-sm text-white"
            style={{
              fontWeight: 700,
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `4px solid ${COLOR_DARK}`,
              opacity: saveMutation.isPending ? 0.7 : 1,
            }}
          >
            {saveMutation.isPending ? "Saving..." : "Save changes"}
          </motion.button>
        </div>
      )}

      {/* Disabled state placeholder */}
      {!enabled && !dirty && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--roost-bg)" }}>
            <PiggyBank className="size-4" style={{ color: "var(--roost-text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Allowance is off for this child.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
