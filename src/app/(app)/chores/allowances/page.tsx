"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Gift,
  Info,
  Lightbulb,
  Pencil,
  PiggyBank,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import PremiumGate from "@/components/shared/PremiumGate";
import MemberAvatar from "@/components/shared/MemberAvatar";
import RewardRuleSheet, {
  type RewardRule,
  type RewardMember,
} from "@/components/chores/RewardRuleSheet";

// ---- Types ------------------------------------------------------------------

interface CurrentPeriod {
  start: string;
  end: string;
  total: number;
  completed: number;
  completionRate: number;
  onTrack: boolean;
}

interface RuleWithProgress extends RewardRule {
  child_name: string;
  child_avatar: string | null;
  currentPeriod: CurrentPeriod;
}

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  name: string;
  avatarColor: string | null;
  email: string | null;
  joinedAt: string | null;
  expiresAt: string | null;
}

interface MembersResponse {
  household: { id: string; name: string; subscriptionStatus: string };
  members: MemberItem[];
}

// ---- Constants --------------------------------------------------------------

const COLOR = "#EF4444";
const COLOR_DARK = "#B91C1C";

// ---- Helpers ----------------------------------------------------------------

function formatPeriodRange(start: string, end: string): string {
  return `${format(parseISO(start), "MMM d")} - ${format(parseISO(end), "MMM d")}`;
}

function PeriodBadge({
  periodType,
  periodDays,
}: {
  periodType: string;
  periodDays: number | null;
}) {
  const styles: Record<
    string,
    { bg: string; text: string; border: string; label: string }
  > = {
    week: {
      bg: "#FFF8E6",
      text: "#C87D00",
      border: "#FADFA0",
      label: "Weekly",
    },
    month: {
      bg: "#EFF6FF",
      text: "#1A5CB5",
      border: "#BAD3F7",
      label: "Monthly",
    },
    year: {
      bg: "#F5F3FF",
      text: "#6D28D9",
      border: "#DDD6FE",
      label: "Yearly",
    },
    custom: {
      bg: "var(--roost-bg)",
      text: "var(--roost-text-muted)",
      border: "var(--roost-border)",
      label: `Every ${periodDays ?? "?"} days`,
    },
  };
  const s = styles[periodType] ?? styles.custom;
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `0.5px solid ${s.border}`,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 6,
      }}
    >
      {s.label}
    </span>
  );
}

function RewardBadge({ rule }: { rule: RuleWithProgress }) {
  if (rule.reward_type === "money" && rule.reward_amount) {
    return (
      <span
        style={{
          backgroundColor: "#F0FFF4",
          color: "#159040",
          border: "0.5px solid #A8EAC0",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 6,
        }}
      >
        ${parseFloat(rule.reward_amount).toFixed(2)}/period
      </span>
    );
  }
  if (rule.reward_type === "gift") {
    return (
      <span
        style={{
          backgroundColor: "#F5F3FF",
          color: "#6D28D9",
          border: "0.5px solid #DDD6FE",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Gift style={{ width: 12, height: 12 }} />
        Gift
      </span>
    );
  }
  if (rule.reward_type === "activity") {
    return (
      <span
        style={{
          backgroundColor: "#EFF6FF",
          color: "#1A5CB5",
          border: "0.5px solid #BAD3F7",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Zap style={{ width: 12, height: 12 }} />
        Activity
      </span>
    );
  }
  return (
    <span
      style={{
        backgroundColor: "var(--roost-bg)",
        color: "var(--roost-text-muted)",
        border: "0.5px solid var(--roost-border)",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 6,
      }}
    >
      Custom reward
    </span>
  );
}

// ---- Page -------------------------------------------------------------------

export default function RewardsPage() {
  const router = useRouter();
  const { role, isLoading: householdLoading } = useHousehold();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);

  // Redirect non-admin
  useEffect(() => {
    if (!householdLoading && role !== undefined && role !== "admin") {
      router.replace("/chores");
    }
  }, [householdLoading, role, router]);

  const { data: rewardsData, isLoading: rulesLoading } = useQuery<{
    rules: RuleWithProgress[];
  }>({
    queryKey: ["rewards"],
    queryFn: async () => {
      const r = await fetch("/api/rewards");
      if (!r.ok) throw new Error("Failed to load rewards");
      return r.json();
    },
    staleTime: 30_000,
    enabled: role === "admin",
  });

  const { data: membersData, isLoading: membersLoading } =
    useQuery<MembersResponse>({
      queryKey: ["household-members"],
      queryFn: async () => {
        const r = await fetch("/api/household/members");
        if (!r.ok) throw new Error("Failed to load members");
        return r.json();
      },
      staleTime: 30_000,
      enabled: role === "admin",
    });

  const toggleMutation = useMutation({
    mutationFn: async ({
      ruleId,
      enabled,
    }: {
      ruleId: string;
      enabled: boolean;
    }) => {
      const r = await fetch(`/api/rewards/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!r.ok) throw new Error("Failed to update rule");
      return r.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success(vars.enabled ? "Rule enabled" : "Rule paused", {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
    },
    onError: () => {
      toast.error("Could not update rule", {
        description: "Try again in a moment.",
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const rules = rewardsData?.rules ?? [];
  const members = membersData?.members ?? [];
  const children: RewardMember[] = members
    .filter((m) => m.role === "child")
    .map((m) => ({
      userId: m.userId,
      name: m.name,
      avatarColor: m.avatarColor ?? null,
      role: m.role,
    }));
  const isPremium =
    membersData?.household?.subscriptionStatus === "premium";
  const isLoading = rulesLoading || membersLoading;

  // Don't render while redirecting
  if (householdLoading || (role !== undefined && role !== "admin")) return null;

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
          type="button"
          onClick={() => router.push("/chores")}
          className="mb-5 flex cursor-pointer items-center gap-1"
          style={{
            color: "var(--roost-text-muted)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          Back to chores
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#FFF0F0",
              }}
            >
              <Trophy style={{ width: 20, height: 20, color: COLOR }} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--roost-text-primary)",
                  lineHeight: 1.2,
                }}
              >
                Rewards
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--roost-text-muted)",
                  marginTop: 2,
                }}
              >
                Chore goals and prizes for your household
              </p>
            </div>
          </div>
          {isPremium && (
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                setEditingRule(null);
                setSheetOpen(true);
              }}
              style={{
                backgroundColor: "#FFF0F0",
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                borderRadius: 10,
                color: COLOR,
                fontSize: 13,
                fontWeight: 800,
                padding: "9px 16px",
                cursor: "pointer",
              }}
            >
              + Add rule
            </motion.button>
          )}
        </div>

        {/* How it works explainer */}
        <div
          className="mb-6"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "0.5px solid var(--roost-border)",
            borderLeft: `4px solid ${COLOR}`,
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            className="mb-2.5 flex items-center gap-2"
          >
            <Lightbulb
              style={{ width: 16, height: 16, color: COLOR, flexShrink: 0 }}
            />
            <p
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "var(--roost-text-primary)",
              }}
            >
              How rewards work
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              "Set a goal for a child: choose a period (weekly, monthly, or custom), a completion threshold, and a reward.",
              "Your child completes chores as normal. Roost tracks their progress against the goal automatically.",
              "At the end of each period, Roost evaluates completion. If the threshold is met, the reward unlocks: money rewards are logged as an expense, other rewards notify you to arrange them.",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: COLOR,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {i + 1}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--roost-text-primary)",
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              height: "0.5px",
              backgroundColor: "var(--roost-border)",
              margin: "12px 0",
            }}
          />
          <div className="flex items-center gap-1.5">
            <Info
              style={{
                width: 12,
                height: 12,
                color: "var(--roost-text-muted)",
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--roost-text-muted)",
              }}
            >
              Children can see their progress and claim earned rewards from
              their dashboard.
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {/* Premium gate */}
        {!isLoading && !isPremium && (
          <PremiumGate feature="allowances" trigger="inline" />
        )}

        {/* No children */}
        {!isLoading && isPremium && children.length === 0 && (
          <div
            className="flex flex-col items-center text-center"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "0.5px solid var(--roost-border)",
              borderBottom: `4px solid ${COLOR}`,
              borderRadius: 12,
              padding: "24px 20px",
            }}
          >
            <Users
              style={{
                width: 32,
                height: 32,
                color: "var(--roost-text-muted)",
                marginBottom: 8,
              }}
            />
            <p
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--roost-text-primary)",
                marginBottom: 6,
              }}
            >
              No children in your household
            </p>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--roost-text-muted)",
                maxWidth: 260,
                margin: "0 auto 16px",
              }}
            >
              Add a child member first. Go to Settings and invite or create a
              child account, then come back to set up rewards.
            </p>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => router.push("/settings")}
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                padding: "9px 16px",
                cursor: "pointer",
              }}
            >
              Go to Settings
            </motion.button>
          </div>
        )}

        {/* Empty state — children exist but no rules */}
        {!isLoading && isPremium && children.length > 0 && rules.length === 0 && (
          <div
            className="flex flex-col items-center text-center"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "0.5px solid var(--roost-border)",
              borderBottom: `4px solid ${COLOR}`,
              borderRadius: 12,
              padding: "28px 20px",
            }}
          >
            <Trophy
              style={{ width: 36, height: 36, color: COLOR, marginBottom: 10 }}
            />
            <p
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--roost-text-primary)",
                marginBottom: 6,
              }}
            >
              No rewards set up yet
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--roost-text-muted)",
                maxWidth: 280,
                margin: "0 auto 16px",
              }}
            >
              Create your first reward rule. Pick a child, set a chore
              completion goal, and choose what they earn: cash, a gift, an
              activity, or anything else that motivates them.
            </p>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                setEditingRule(null);
                setSheetOpen(true);
              }}
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                padding: "9px 16px",
                cursor: "pointer",
              }}
            >
              + Add first reward
            </motion.button>
          </div>
        )}

        {/* Rules list */}
        {!isLoading && isPremium && rules.length > 0 && (
          <div>
            {rules.map((rule) => {
              const period = rule.currentPeriod;
              const childFirstName = rule.child_name?.split(" ")[0] ?? "Child";

              return (
                <div
                  key={rule.id}
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "0.5px solid var(--roost-border)",
                    borderBottom: `4px solid ${COLOR}`,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 10,
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar
                        name={rule.child_name ?? ""}
                        avatarColor={rule.child_avatar}
                        size="sm"
                      />
                      <div>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "var(--roost-text-primary)",
                          }}
                        >
                          {rule.child_name}
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--roost-text-muted)",
                          }}
                        >
                          {rule.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRule(rule);
                          setSheetOpen(true);
                        }}
                        style={{
                          padding: 4,
                          borderRadius: 6,
                          color: "var(--roost-text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        aria-label="Edit rule"
                      >
                        <Pencil style={{ width: 16, height: 16 }} />
                      </button>
                      <div style={{ "--primary": COLOR } as React.CSSProperties}>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(val) =>
                            toggleMutation.mutate({
                              ruleId: rule.id,
                              enabled: val,
                            })
                          }
                          disabled={toggleMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div
                    className="flex flex-wrap gap-1.5"
                    style={{ marginTop: 10 }}
                  >
                    <PeriodBadge
                      periodType={rule.period_type}
                      periodDays={rule.period_days}
                    />
                    <RewardBadge rule={rule} />
                    <span
                      style={{
                        backgroundColor: "var(--roost-bg)",
                        color: "var(--roost-text-muted)",
                        border: "0.5px solid var(--roost-border)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {rule.threshold_percent}% required
                    </span>
                  </div>

                  {/* Progress section */}
                  <div
                    style={{
                      marginTop: 12,
                      borderTop: "0.5px solid var(--roost-border)",
                      paddingTop: 12,
                    }}
                  >
                    {period && period.total > 0 ? (
                      <>
                        {/* Period label row */}
                        <div
                          className="flex items-center justify-between"
                          style={{ marginBottom: 6 }}
                        >
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--roost-text-muted)",
                            }}
                          >
                            This period · {formatPeriodRange(period.start, period.end)}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "var(--roost-text-muted)",
                            }}
                          >
                            {period.completed} of {period.total} chores
                          </p>
                        </div>

                        {/* Progress bar */}
                        <div
                          style={{
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: "var(--roost-border)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(period.completionRate, 100)}%`,
                              backgroundColor:
                                period.completionRate >= rule.threshold_percent
                                  ? "#22C55E"
                                  : COLOR,
                              borderRadius: 4,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>

                        {/* Status row */}
                        <div
                          className="flex items-center justify-between"
                          style={{ marginTop: 6 }}
                        >
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color:
                                period.completionRate >= rule.threshold_percent
                                  ? "#159040"
                                  : "var(--roost-text-muted)",
                            }}
                          >
                            {period.completionRate >= rule.threshold_percent
                              ? "On track to earn reward"
                              : period.completionRate > 0
                              ? `${period.completionRate}% complete, need ${rule.threshold_percent}%`
                              : "No chores completed yet"}
                          </p>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color:
                                period.completionRate >= rule.threshold_percent
                                  ? "#159040"
                                  : "var(--roost-text-primary)",
                            }}
                          >
                            {period.completionRate}%
                          </p>
                        </div>
                      </>
                    ) : (
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--roost-text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        No chores assigned to {childFirstName} yet. Assign
                        chores to start tracking progress.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bottom info row */}
            <div
              className="flex items-center gap-1.5"
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "0.5px solid var(--roost-border)",
              }}
            >
              <PiggyBank
                style={{
                  width: 14,
                  height: 14,
                  color: "var(--roost-text-muted)",
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--roost-text-muted)",
                }}
              >
                Money rewards are automatically logged as expenses when earned.
                Gift and activity rewards notify you to arrange them.
              </p>
            </div>
          </div>
        )}

        {/* Sheet */}
        <RewardRuleSheet
          open={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
            setEditingRule(null);
          }}
          rule={editingRule}
          members={children}
        />
      </motion.div>
    </PageContainer>
  );
}
