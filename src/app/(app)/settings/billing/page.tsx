"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CheckCircle,
  CheckSquare,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  Loader2,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
// ---- Feature card data -------------------------------------------------------

interface FeatureCardSpec {
  icon: React.ElementType;
  title: string;
  hook: string;
  bullets: string[];
  borderColor: string;
  iconBg: string;
  checkColor: string;
}

const EXPENSES_CARD: FeatureCardSpec = {
  icon: DollarSign,
  title: "Expenses",
  hook: "Split expenses — free. Master your money — premium.",
  borderColor: "#639922",
  iconBg: "#EAF3DE",
  checkColor: "#639922",
  bullets: [
    "Scan receipts with your camera",
    "Categorize expenses your way",
    "Track recurring payments automatically",
    "Set and monitor budgets",
    "Visualize spending with insights",
    "Export data as CSV or PDF",
  ],
};

const ROW1_CARDS: FeatureCardSpec[] = [
  {
    icon: CheckSquare,
    title: "Chores",
    hook: "Auto-reset. Always done.",
    borderColor: "#E24B4A",
    iconBg: "#FCEBEB",
    checkColor: "#E24B4A",
    bullets: [
      "Recurring daily, weekly, or monthly",
      "Streaks and leaderboard rankings",
      "Full history and unlimited chores",
    ],
  },
  {
    icon: ShoppingCart,
    title: "Grocery",
    hook: "Never forget an item.",
    borderColor: "#BA7517",
    iconBg: "#FAEEDA",
    checkColor: "#BA7517",
    bullets: [
      "Multiple lists per store or trip",
      "Meal plan syncs to your list",
      "Real-time sync for everyone",
    ],
  },
  {
    icon: UtensilsCrossed,
    title: "Meals",
    hook: "Everyone votes. Nobody argues.",
    borderColor: "#EF9F27",
    iconBg: "#FAEEDA",
    checkColor: "#EF9F27",
    bullets: [
      "Household voting on the week's meals",
      "Auto-add ingredients to grocery",
      "Meal bank and unlimited history",
    ],
  },
  {
    icon: Bell,
    title: "Reminders",
    hook: "Set once. Never miss it.",
    borderColor: "#1D9E75",
    iconBg: "#E1F5EE",
    checkColor: "#1D9E75",
    bullets: [
      "Recurring reminders forever",
      "Notify one person or whole house",
      "Unlimited — no five-reminder cap",
    ],
  },
];

const ROW2_CARDS: FeatureCardSpec[] = [
  {
    icon: CalendarDays,
    title: "Calendar",
    hook: "One calendar. Whole household.",
    borderColor: "#2563EB",
    iconBg: "#E6F1FB",
    checkColor: "#2563EB",
    bullets: [
      "Recurring events, daily to monthly",
      "Household-wide visibility",
      "Unlimited events with no cap",
    ],
  },
  {
    icon: ClipboardList,
    title: "Tasks",
    hook: "Assign it. Track it. Done.",
    borderColor: "#D4537E",
    iconBg: "#FBEAF0",
    checkColor: "#D4537E",
    bullets: [
      "Assign to any household member",
      "Due dates and priority levels",
      "Unlimited tasks with full history",
    ],
  },
  {
    icon: FileText,
    title: "Notes",
    hook: "Shared. Formatted. Pinned.",
    borderColor: "#7F77DD",
    iconBg: "#EEEDFE",
    checkColor: "#7F77DD",
    bullets: [
      "Rich text with bold, italic, headings",
      "Shared across your whole household",
      "Unlimited notes with no cap",
    ],
  },
  {
    icon: Home,
    title: "Household extras",
    hook: "The whole package.",
    borderColor: "#E24B4A",
    iconBg: "#FCEBEB",
    checkColor: "#E24B4A",
    bullets: [
      "Allowance tied to chore completion",
      "Guest access for temporary members",
      "Household-wide stats and activity",
    ],
  },
];

const CANCEL_LOSSES = [
  "Bill splitting and receipt scanning",
  "Recurring chores and leaderboard",
  "Meal suggestions and voting",
  "Unlimited reminders",
  "Allowance system for kids",
];

// ---- Helpers -----------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---- Sub-components ----------------------------------------------------------

function BulletRow({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex items-start gap-2">
      <Check
        style={{ width: 14, height: 14, color, flexShrink: 0, marginTop: 2 }}
        strokeWidth={3}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--roost-text-secondary)",
          lineHeight: 1.4,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function NewFeatureCard({ spec, fullWidth }: { spec: FeatureCardSpec; fullWidth?: boolean }) {
  const Icon = spec.icon;
  return (
    <div
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1px solid var(--roost-border)",
        borderBottom: `3px solid ${spec.borderColor}`,
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: spec.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 20, height: 20, color: spec.borderColor }} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: "var(--roost-text-primary)" }}>
            {spec.title}
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--roost-text-muted)" }}>
            {spec.hook}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--roost-border)" }} />

      {/* Bullets */}
      {fullWidth ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px 24px",
          }}
        >
          {spec.bullets.map((b) => (
            <BulletRow key={b} text={b} color={spec.checkColor} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {spec.bullets.map((b) => (
            <BulletRow key={b} text={b} color={spec.checkColor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Current plan card -------------------------------------------------------

interface UsageItem {
  label: string;
  used: number;
  limit: number;
  color: string;
}

interface BillingUsageResponse {
  choresCount: number;
  membersCount: number;
  groceryListsCount: number;
  remindersCount: number;
}

function UsageRow({ item }: { item: UsageItem }) {
  const pct = item.limit > 0 ? Math.min(Math.round((item.used / item.limit) * 100), 100) : 0;
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--roost-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 6,
        }}
      >
        {item.label}
      </p>
      <p style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--roost-text-primary)" }}>
          {item.used}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--roost-text-secondary)" }}>
          {" "}/ {item.limit} used
        </span>
      </p>
      <div
        style={{
          height: 6,
          backgroundColor: "var(--roost-bg)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 6,
            width: `${pct}%`,
            backgroundColor: item.color,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

interface CurrentPlanCardProps {
  isPremium: boolean;
  isCancelled: boolean;
  premiumExpiresAt: string | null | undefined;
  isAdmin: boolean;
  usage: UsageItem[];
  onReactivate: () => void;
  isReactivating: boolean;
  onCancel: () => void;
}

function CurrentPlanCard({
  isPremium,
  isCancelled,
  premiumExpiresAt,
  isAdmin,
  usage,
  onReactivate,
  isReactivating,
  onCancel,
}: CurrentPlanCardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Top section */}
      <div
        style={{
          padding: "20px 24px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {/* Left: icon + text */}
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "var(--roost-bg)",
              border: "1px solid var(--roost-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Home size={22} style={{ color: "var(--roost-text-secondary)" }} />
          </div>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--roost-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: 4,
              }}
            >
              Current plan
            </p>
            <p
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "var(--roost-text-primary)",
              }}
            >
              {isPremium ? "Roost Premium" : "Free"}
            </p>
          </div>
        </div>

        {/* Right: badge + admin actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            marginTop: 4,
          }}
        >
          {isPremium ? (
            <>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#22C55E",
                  backgroundColor: "rgba(34,197,94,0.10)",
                  border: "1px solid rgba(34,197,94,0.30)",
                  borderRadius: 20,
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                Active
              </span>
              {isAdmin &&
                (isCancelled ? (
                  <button
                    type="button"
                    onClick={onReactivate}
                    disabled={isReactivating}
                    style={{ fontSize: 12, fontWeight: 700, color: "#22C55E" }}
                  >
                    {isReactivating ? "Reactivating..." : "Reactivate"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onCancel}
                    style={{ fontSize: 12, fontWeight: 700, color: "#EF4444" }}
                  >
                    Cancel plan
                  </button>
                ))}
            </>
          ) : (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--roost-text-secondary)",
                backgroundColor: "var(--roost-bg)",
                border: "1px solid var(--roost-border)",
                borderRadius: 20,
                padding: "4px 10px",
                whiteSpace: "nowrap",
              }}
            >
              Free forever
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "var(--roost-border)" }} />

      {/* Bottom section */}
      {isPremium ? (
        <div style={{ padding: "14px 24px 18px", display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--roost-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                marginBottom: 6,
              }}
            >
              {isCancelled ? "Premium ends" : "Next billing date"}
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: isCancelled ? "#F59E0B" : "var(--roost-text-primary)",
              }}
            >
              {isCancelled && premiumExpiresAt ? formatDate(premiumExpiresAt) : "Billed monthly"}
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "14px 24px 18px",
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          {usage.map((item) => (
            <UsageRow key={item.label} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Upgrade button (reused in hero + bottom CTA) ----------------------------

function UpgradeButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ y: 2 }}
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center"
      style={{
        width: "100%",
        height: 52,
        backgroundColor: "#EF4444",
        borderRadius: 14,
        boxShadow: "0 4px 0 #C93B3B",
        border: "none",
        color: "white",
        fontSize: 15,
        fontWeight: 800,
        opacity: loading ? 0.7 : 1,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : label}
    </motion.button>
  );
}

// ---- Inner component (requires Suspense for useSearchParams) -----------------

function BillingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isPremium, isCancelled, premiumExpiresAt, role, isLoading } = useHousehold();

  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [cancelledBanner, setCancelledBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isAdmin = role === "admin";

  // ---- Usage data queries (for free-tier plan card) --------------------------

  const { data: usageData } = useQuery<BillingUsageResponse>({
    queryKey: ["billing-usage"],
    queryFn: async () => {
      const r = await fetch("/api/settings/billing/usage");
      if (!r.ok) {
        return {
          choresCount: 0,
          membersCount: 0,
          groceryListsCount: 0,
          remindersCount: 0,
        };
      }
      return r.json();
    },
    staleTime: 30_000,
    enabled: !isLoading,
  });

  const usageItems: UsageItem[] = [
    {
      label: "Chores",
      used: usageData?.choresCount ?? 0,
      limit: 5,
      color: "#EF4444",
    },
    {
      label: "Members",
      used: usageData?.membersCount ?? 0,
      limit: 5,
      color: "#3B82F6",
    },
    {
      label: "Grocery lists",
      used: usageData?.groceryListsCount ?? 0,
      limit: 1,
      color: "#F59E0B",
    },
    {
      label: "Reminders",
      used: usageData?.remindersCount ?? 0,
      limit: 5,
      color: "#06B6D4",
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function reconcileCheckout() {
      if (searchParams.get("success") === "true") {
        const sessionId = searchParams.get("session_id");
        router.replace("/settings/billing");

        if (!sessionId) {
          toast.error("Could not verify upgrade", {
            description: "Missing Stripe session ID. Please refresh billing in a moment.",
          });
          return;
        }

        try {
          const res = await fetch(`/api/stripe/checkout-status?session_id=${encodeURIComponent(sessionId)}`);
          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.verified) {
            toast.message("Payment received, upgrade still syncing.", {
              description: "Stripe finished checkout, but Premium has not been confirmed yet. Refresh in a moment.",
            });
            await queryClient.invalidateQueries({ queryKey: ["household"] });
            return;
          }

          await queryClient.invalidateQueries({ queryKey: ["household"] });
          setSuccessBanner(true);
          setTimeout(() => setSuccessBanner(false), 5000);
        } catch {
          toast.error("Could not verify upgrade", {
            description: "Please refresh the billing page in a moment.",
          });
        }
      }

      if (searchParams.get("cancelled") === "true") {
        setCancelledBanner(true);
        router.replace("/settings/billing");
        setTimeout(() => setCancelledBanner(false), 3000);
      }
    }

    void reconcileCheckout();
  }, [queryClient, router, searchParams]);

  async function handleCheckout() {
    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Could not start checkout", {
          description: data.error ?? "Please try again.",
        });
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Could not start checkout", {
        description: "A network error occurred. Please try again.",
      });
      setIsCheckingOut(false);
    }
  }

  async function handleReactivate() {
    setIsReactivating(true);
    try {
      const res = await fetch("/api/stripe/reactivate", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Could not reactivate", {
          description: data.error ?? "Please try again.",
        });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["household"] });
      toast.success("Premium reactivated.");
    } catch {
      toast.error("Could not reactivate", {
        description: "A network error occurred. Please try again.",
      });
    } finally {
      setIsReactivating(false);
    }
  }

  async function handleCancel() {
    setIsCancelling(true);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      if (!res.ok) {
        toast.error("Could not cancel", {
          description: "Please try again or contact support.",
        });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["household"] });
      setShowCancelFlow(false);
      const endDate =
        premiumExpiresAt
          ? formatDate(premiumExpiresAt)
          : "the end of your billing period";
      toast.success(
        `Subscription cancelled. You will stay Premium until ${endDate}.`
      );
    } catch {
      toast.error("Could not cancel", {
        description: "A network error occurred. Please try again.",
      });
    } finally {
      setIsCancelling(false);
    }
  }

  async function handlePortal() {
    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Could not open billing portal", {
          description: data.error ?? "Please try again.",
        });
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Could not open billing portal", {
        description: "A network error occurred. Please try again.",
      });
      setIsPortalLoading(false);
    }
  }

  if (!mounted || isLoading) {
    return (
      <PageContainer>
        <div className="flex h-48 items-center justify-center">
          <Loader2
            className="size-6 animate-spin"
            style={{ color: "var(--roost-text-muted)" }}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="space-y-6 pb-16 pt-2"
      >
        {/* ---- Banners ------------------------------------------------------- */}
        <AnimatePresence>
          {successBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-start gap-3 rounded-2xl p-4"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "4px solid #22C55E",
              }}
            >
              <CheckCircle
                className="mt-0.5 size-5 shrink-0"
                style={{ color: "#22C55E" }}
              />
              <div>
                <p
                  className="text-sm"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
                >
                  Welcome to Premium. Your household is now upgraded.
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  It may take a moment to reflect.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cancelledBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "4px solid var(--roost-border-bottom)",
              }}
            >
              <X className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
              <p
                className="text-sm"
                style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
              >
                No worries. Your plan was not changed.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- 1. Page header ------------------------------------------------ */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
            }}
          >
            <ArrowLeft className="size-4" style={{ color: "var(--roost-text-primary)" }} />
          </button>
          <h1
            className="text-2xl"
            style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
          >
            Billing
          </h1>
        </div>

        {/* ---- 2. Current plan card ------------------------------------------ */}
        <CurrentPlanCard
          isPremium={isPremium}
          isCancelled={isCancelled}
          premiumExpiresAt={premiumExpiresAt}
          isAdmin={isAdmin}
          usage={usageItems}
          onReactivate={handleReactivate}
          isReactivating={isReactivating}
          onCancel={() => setShowCancelFlow(true)}
        />

        {/* ---- 3. Premium hero card (free + admin only) ----------------------- */}
        {!isPremium && isAdmin && (
          <div
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1px solid var(--roost-border)",
              borderBottom: "4px solid #EF4444",
              borderRadius: 20,
              padding: "28px 24px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#EF4444",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: 12,
              }}
            >
              Roost Premium
            </p>

            <div className="flex items-baseline gap-1" style={{ marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: "var(--roost-text-primary)",
                  lineHeight: 1,
                }}
              >
                $4
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--roost-text-secondary)",
                }}
              >
                /month
              </span>
            </div>

            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--roost-text-secondary)",
                marginBottom: 16,
              }}
            >
              Per household. Everyone benefits.
            </p>

            <div
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10,
                padding: "8px 14px",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: "#EF4444" }}>
                A family of five pays less than $1/month each.
              </p>
            </div>

            <UpgradeButton
              label="Upgrade to Premium"
              loading={isCheckingOut}
              onClick={handleCheckout}
            />

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--roost-text-secondary)",
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Non-admin free tier nudge */}
        {!isPremium && !isAdmin && (
          <div
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid var(--roost-border-bottom)",
              borderRadius: 16,
              padding: "16px 20px",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--roost-text-secondary)" }}>
              Ask your household admin to upgrade to Premium for $4/month.
            </p>
          </div>
        )}

        {/* ---- 4. Section label ----------------------------------------------- */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--roost-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }}
        >
          What you unlock with Premium
        </p>

        {/* ---- 5. Feature sections -------------------------------------------- */}
        <div className="flex flex-col gap-3">
          {/* Expenses — full width, 3-col bullet grid */}
          <NewFeatureCard spec={EXPENSES_CARD} fullWidth />

          {/* Row 1: Chores, Grocery, Meals, Reminders */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {ROW1_CARDS.map((spec) => (
              <NewFeatureCard key={spec.title} spec={spec} />
            ))}
          </div>

          {/* Row 2: Calendar, Tasks, Notes, Household extras */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {ROW2_CARDS.map((spec) => (
              <NewFeatureCard key={spec.title} spec={spec} />
            ))}
          </div>
        </div>

        {/* ---- 6. Bottom CTA (free + admin only) ------------------------------ */}
        {!isPremium && isAdmin && (
          <div
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid #EF4444",
              borderRadius: 20,
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "var(--roost-text-primary)",
                fontSize: 20,
                fontWeight: 900,
                marginBottom: 8,
              }}
            >
              One subscription. The whole house.
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--roost-text-secondary)",
                marginBottom: 20,
              }}
            >
              Every member in your household gets everything. No per-person fees, no tiers, no games.
            </p>

            <hr
              style={{
                border: "none",
                borderTop: "0.5px solid var(--roost-border)",
                marginBottom: 20,
              }}
            />

            <UpgradeButton
              label="Upgrade to Premium for $4/month"
              loading={isCheckingOut}
              onClick={handleCheckout}
            />

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--roost-text-secondary)",
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Premium: manage payment link */}
        {isPremium && isAdmin && !isCancelled && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={handlePortal}
              disabled={isPortalLoading}
              style={{ fontSize: 13, fontWeight: 700, color: "var(--roost-text-muted)" }}
            >
              {isPortalLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" /> Loading...
                </span>
              ) : (
                "Manage payment method"
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* ---- Cancel flow sheet ---------------------------------------------- */}
      <Sheet open={showCancelFlow} onOpenChange={setShowCancelFlow}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl"
          style={{ backgroundColor: "var(--roost-bg)" }}
        >
          <SheetHeader className="pb-2">
            <div
              className="mx-auto mb-3 h-1 w-10 rounded-full"
              style={{ backgroundColor: "var(--roost-border)" }}
            />
            <SheetTitle
              className="text-xl"
              style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
            >
              Before you go...
            </SheetTitle>
            <p
              className="text-sm"
              style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
            >
              Here is what you will lose when Premium ends.
            </p>
          </SheetHeader>

          <div className="space-y-5 px-1 pb-6">
            <div
              className="space-y-3 rounded-2xl p-4"
              style={{
                backgroundColor: "rgba(0,0,0,0.04)",
                border: "1.5px solid rgba(0,0,0,0.08)",
                borderBottom: "4px solid #D1D5DB",
              }}
            >
              {CANCEL_LOSSES.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <X className="size-4 shrink-0" style={{ color: "#EF4444" }} />
                  <span
                    className="text-sm"
                    style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {premiumExpiresAt && (
              <p
                className="text-sm"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                You will stay Premium until {formatDate(premiumExpiresAt)}. After that your household returns to the free plan.
              </p>
            )}

            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={() => setShowCancelFlow(false)}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: "#22C55E",
                border: "1.5px solid #22C55E",
                borderBottom: "3px solid #159040",
                fontWeight: 800,
              }}
            >
              Keep Premium
            </motion.button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex h-10 w-full items-center justify-center gap-2 text-sm"
              style={{ color: "#EF4444", fontWeight: 700 }}
            >
              {isCancelling ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Cancel anyway"
              )}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}

// ---- Default export wrapped in Suspense for useSearchParams -----------------

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  );
}
