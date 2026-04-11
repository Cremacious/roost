"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Info, Loader2 } from "lucide-react";
import DraggableSheet from "@/components/shared/DraggableSheet";
import MemberAvatar from "@/components/shared/MemberAvatar";

// ---- Types ------------------------------------------------------------------

export interface RewardRule {
  id: string;
  household_id: string;
  user_id: string;
  title: string;
  reward_type: string;
  reward_description: string | null;
  reward_amount: string | null;
  period_type: string;
  period_days: number | null;
  threshold_percent: number;
  enabled: boolean;
  starts_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RewardMember {
  userId: string;
  name: string;
  avatarColor: string | null;
  role: string;
}

// ---- Constants --------------------------------------------------------------

const COLOR = "#EF4444";
const COLOR_DARK = "#B91C1C";

const PERIOD_LABELS: Record<string, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  custom: "Custom",
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  money: "Money",
  gift: "Gift",
  activity: "Activity",
  other: "Other",
};

const REWARD_PLACEHOLDERS: Record<string, string> = {
  gift: "e.g. new book, toy of their choice...",
  activity: "e.g. bowling trip, movie night...",
  other: "e.g. 30 min extra screen time...",
};

// ---- Helpers ----------------------------------------------------------------

function getExplanation(
  periodType: string,
  periodDays: string,
  threshold: number,
  childName: string,
  rewardType: string
): string {
  const name = childName.split(" ")[0];
  const pct = `${threshold}%`;

  let base = "";
  if (periodType === "week") {
    base = `Each week, Roost counts ${name}'s chore completions. If they hit ${pct} by Sunday, they earn this reward automatically.`;
  } else if (periodType === "month") {
    base = `At the end of each month, Roost tallies ${name}'s chores. Hit ${pct} and the reward is theirs.`;
  } else if (periodType === "year") {
    base = `At year's end, Roost evaluates the full year of chores. A great reward for a big goal.`;
  } else {
    const days = parseInt(periodDays) || 30;
    base = `Every ${days} days, Roost checks ${name}'s progress. Hit ${pct} and the reward is unlocked.`;
  }

  const moneyNote =
    rewardType === "money"
      ? " Money rewards are logged as an expense automatically - no manual tracking needed."
      : " You will be notified when this is earned so you can arrange it.";

  return base + moneyNote;
}

// ---- Component --------------------------------------------------------------

export default function RewardRuleSheet({
  open,
  onClose,
  rule,
  members,
}: {
  open: boolean;
  onClose: () => void;
  rule: RewardRule | null;
  members: RewardMember[];
}) {
  const queryClient = useQueryClient();
  const isEdit = rule !== null;

  const [userId, setUserId] = useState(members[0]?.userId ?? "");
  const [title, setTitle] = useState("");
  const [rewardType, setRewardType] = useState<"money" | "gift" | "activity" | "other">("money");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [periodType, setPeriodType] = useState<"week" | "month" | "year" | "custom">("week");
  const [periodDays, setPeriodDays] = useState("30");
  const [threshold, setThreshold] = useState(80);

  // Populate in edit mode
  useEffect(() => {
    if (rule) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserId(rule.user_id);
      setTitle(rule.title);
      setRewardType(rule.reward_type as typeof rewardType);
      setRewardDescription(rule.reward_description ?? "");
      setRewardAmount(rule.reward_amount ?? "");
      setPeriodType(rule.period_type as typeof periodType);
      setPeriodDays(String(rule.period_days ?? 30));
      setThreshold(rule.threshold_percent);
    } else {
      setUserId(members[0]?.userId ?? "");
      setTitle("");
      setRewardType("money");
      setRewardDescription("");
      setRewardAmount("");
      setPeriodType("week");
      setPeriodDays("30");
      setThreshold(80);
    }
  }, [rule, members]);

  const selectedChild = members.find((m) => m.userId === userId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        user_id: userId,
        title: title.trim(),
        reward_type: rewardType,
        reward_description: rewardDescription.trim() || undefined,
        reward_amount: rewardType === "money" ? parseFloat(rewardAmount) : undefined,
        period_type: periodType,
        period_days: periodType === "custom" ? parseInt(periodDays) : undefined,
        threshold_percent: threshold,
      };

      const url = isEdit ? `/api/rewards/${rule.id}` : "/api/rewards";
      const method = isEdit ? "PATCH" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save reward rule");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success(isEdit ? "Reward rule updated" : "Reward rule created", {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Could not save reward rule", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!rule) return;
      const r = await fetch(`/api/rewards/${rule.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete reward rule");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("Reward rule deleted", {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Could not delete reward rule", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  function handleDelete() {
    if (
      window.confirm(
        "Delete this reward rule? Past payouts are kept."
      )
    ) {
      deleteMutation.mutate();
    }
  }

  const canSave =
    members.length > 0 &&
    title.trim().length > 0 &&
    title.trim().length <= 60 &&
    (rewardType !== "money" || (parseFloat(rewardAmount) > 0)) &&
    (periodType !== "custom" || parseInt(periodDays) >= 3);

  return (
    <DraggableSheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      featureColor={COLOR}
    >
      <div className="px-4 pb-8">
        <p
          className="mb-5 text-lg"
          style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
        >
          {isEdit ? "Edit reward rule" : "New reward rule"}
        </p>

        {/* Who earns this? (create only) */}
        {!isEdit && (
          <div className="mb-5">
            <label
              className="mb-2 block text-xs"
              style={{ color: "#374151", fontWeight: 700 }}
            >
              Who earns this?
            </label>
            {members.length === 0 ? (
              <div
                className="rounded-xl p-3 text-sm"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  color: "var(--roost-text-muted)",
                  fontWeight: 600,
                }}
              >
                Add a child member first to set up rewards.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const selected = m.userId === userId;
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => setUserId(m.userId)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{
                        backgroundColor: selected ? `${COLOR}12` : "var(--roost-surface)",
                        border: `1.5px solid ${selected ? COLOR : "var(--roost-border)"}`,
                        borderBottom: `3px solid ${selected ? COLOR_DARK : "var(--roost-border-bottom)"}`,
                        color: selected ? COLOR : "var(--roost-text-primary)",
                        fontWeight: 700,
                      }}
                    >
                      <MemberAvatar
                        name={m.name}
                        avatarColor={m.avatarColor}
                        size="sm"
                      />
                      <span className="text-sm">{m.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rule name */}
        <div className="mb-5">
          <label
            className="mb-1 block text-xs"
            style={{ color: "#374151", fontWeight: 700 }}
          >
            Rule name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Weekly all-star"
            className="flex h-11 w-full rounded-xl bg-transparent px-3 text-sm focus:outline-none"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: `3px solid ${COLOR}40`,
              color: "var(--roost-text-primary)",
              fontWeight: 600,
            }}
          />
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            Give this goal a name the whole family will recognize.
          </p>
        </div>

        {/* Period */}
        <div className="mb-5">
          <label
            className="mb-2 block text-xs"
            style={{ color: "#374151", fontWeight: 700 }}
          >
            Period
          </label>
          <div
            className="flex overflow-hidden rounded-xl"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
            }}
          >
            {(["week", "month", "year", "custom"] as const).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodType(p)}
                className="flex-1 py-2 text-xs transition-colors"
                style={{
                  borderLeft: i > 0 ? "1px solid var(--roost-border)" : undefined,
                  backgroundColor: periodType === p ? COLOR : "var(--roost-surface)",
                  color: periodType === p ? "white" : "var(--roost-text-secondary)",
                  fontWeight: periodType === p ? 800 : 600,
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          {periodType === "custom" && (
            <div className="mt-3">
              <label
                className="mb-1 block text-xs"
                style={{ color: "#374151", fontWeight: 700 }}
              >
                Every how many days?
              </label>
              <input
                type="number"
                min={3}
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                className="flex h-11 w-full rounded-xl bg-transparent px-3 text-sm focus:outline-none"
                style={{
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: `3px solid ${COLOR}40`,
                  color: "var(--roost-text-primary)",
                  fontWeight: 600,
                }}
              />
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                e.g. 14 for a two-week sprint
              </p>
            </div>
          )}
        </div>

        {/* Completion threshold */}
        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <label
              className="text-xs"
              style={{ color: "#374151", fontWeight: 700 }}
            >
              Complete at least
            </label>
            <span
              className="text-base"
              style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
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
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            of assigned chores during the period
          </p>
        </div>

        {/* Reward type */}
        <div className="mb-5">
          <label
            className="mb-2 block text-xs"
            style={{ color: "#374151", fontWeight: 700 }}
          >
            Reward type
          </label>
          <div
            className="flex overflow-hidden rounded-xl"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
            }}
          >
            {(["money", "gift", "activity", "other"] as const).map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setRewardType(t)}
                className="flex-1 py-2 text-xs transition-colors"
                style={{
                  borderLeft: i > 0 ? "1px solid var(--roost-border)" : undefined,
                  backgroundColor: rewardType === t ? COLOR : "var(--roost-surface)",
                  color: rewardType === t ? "white" : "var(--roost-text-secondary)",
                  fontWeight: rewardType === t ? 800 : 600,
                }}
              >
                {REWARD_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Reward detail input */}
          <div className="mt-3">
            {rewardType === "money" ? (
              <>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: "#374151", fontWeight: 700 }}
                >
                  Amount
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
                    min={0.01}
                    step={0.01}
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    placeholder="5.00"
                    className="flex h-11 w-full rounded-xl bg-transparent pl-7 pr-4 text-sm focus:outline-none"
                    style={{
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid #22C55E40",
                      color: "var(--roost-text-primary)",
                      fontWeight: 600,
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: "#374151", fontWeight: 700 }}
                >
                  Describe the reward
                </label>
                <input
                  type="text"
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder={REWARD_PLACEHOLDERS[rewardType] ?? ""}
                  className="flex h-11 w-full rounded-xl bg-transparent px-3 text-sm focus:outline-none"
                  style={{
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: `3px solid ${COLOR}40`,
                    color: "var(--roost-text-primary)",
                    fontWeight: 600,
                  }}
                />
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  You will be notified when this is earned so you can arrange it.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Explanation callout */}
        <div
          className="mb-5 flex gap-2 rounded-xl p-3"
          style={{
            backgroundColor: "var(--roost-surface)",
            borderLeft: `3px solid ${COLOR}`,
            border: "1.5px solid var(--roost-border)",
            borderLeftWidth: "3px",
          }}
        >
          <Info
            className="mt-0.5 shrink-0"
            style={{ width: 14, height: 14, color: "var(--roost-text-muted)" }}
          />
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            {getExplanation(
              periodType,
              periodDays,
              threshold,
              selectedChild?.name ?? "your child",
              rewardType
            )}
          </p>
        </div>

        {/* Save button */}
        <motion.button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending || members.length === 0}
          whileTap={{ y: 1 }}
          className="flex h-11 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `4px solid ${COLOR_DARK}`,
            fontWeight: 800,
          }}
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Save rule"
          )}
        </motion.button>

        {/* Delete link (edit only) */}
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="mt-4 flex w-full items-center justify-center text-xs disabled:opacity-50"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete this rule"}
          </button>
        )}
      </div>
    </DraggableSheet>
  );
}
