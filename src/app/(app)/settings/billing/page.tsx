"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useHousehold } from "@/lib/hooks/useHousehold";
import SlabCard from "@/components/shared/SlabCard";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ---- Helpers -----------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---- Free tier feature limits ------------------------------------------------

const FREE_LIMITS = [
  "Up to 5 members",
  "Up to 5 chores",
  "Basic features only",
];

const PREMIUM_FEATURES = [
  "Unlimited chores and recurring schedules",
  "Bill splitting and receipt scanning",
  "Meal suggestions and household voting",
  "Recurring reminders, notify anyone",
  "Chore streaks and leaderboard",
  "Unlimited members and child accounts",
  "Allowance system for kids",
];

const CANCEL_LOSSES = [
  "Bill splitting and receipt scanning",
  "Recurring chores and leaderboard",
  "Meal suggestions and voting",
  "Unlimited reminders",
  "Allowance system for kids",
];

// ---- Inner component that uses useSearchParams (requires Suspense) -----------

function BillingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isPremium, isCancelled, premiumExpiresAt, role, isLoading } =
    useHousehold();

  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const [successBanner, setSuccessBanner] = useState(false);
  const [cancelledBanner, setCancelledBanner] = useState(false);

  const isAdmin = role === "admin";

  // Handle URL params on mount
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessBanner(true);
      router.replace("/settings/billing");
      // Invalidate household query after brief delay for webhook to process
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["household"] });
      }, 2000);
      setTimeout(() => setSuccessBanner(false), 5000);
    }
    if (searchParams.get("cancelled") === "true") {
      setCancelledBanner(true);
      router.replace("/settings/billing");
      setTimeout(() => setCancelledBanner(false), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const endDate = premiumExpiresAt ? formatDate(premiumExpiresAt) : "the end of your billing period";
      toast.success(`Subscription cancelled. You will stay Premium until ${endDate}.`);
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

  if (isLoading) {
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
        className="space-y-5 pb-10"
      >
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
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

        {/* Success banner */}
        <AnimatePresence>
          {successBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SlabCard color="#22C55E">
                <div className="flex items-start gap-3 p-4">
                  <CheckCircle className="mt-0.5 size-5 shrink-0" style={{ color: "#22C55E" }} />
                  <div>
                    <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                      Welcome to Premium! Your household is now upgraded.
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      It may take a moment to reflect.
                    </p>
                  </div>
                </div>
              </SlabCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancelled banner */}
        <AnimatePresence>
          {cancelledBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SlabCard>
                <div className="flex items-center gap-3 p-4">
                  <X className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    No worries. Your plan was not changed.
                  </p>
                </div>
              </SlabCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- FREE TIER -------------------------------------------------- */}
        {!isPremium && (
          <>
            {/* Current plan */}
            <SlabCard>
              <div className="p-5 space-y-3">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                  Current plan
                </p>
                <p className="text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  Free plan
                </p>
                <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  You are on the free plan.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {FREE_LIMITS.map((limit) => (
                    <span
                      key={limit}
                      className="rounded-full px-3 py-1 text-xs"
                      style={{
                        backgroundColor: "var(--roost-bg)",
                        border: "1.5px solid var(--roost-border)",
                        color: "var(--roost-text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      {limit}
                    </span>
                  ))}
                </div>
              </div>
            </SlabCard>

            {/* Premium plan card */}
            {isAdmin && (
              <SlabCard color="#EF4444">
                <div className="p-5 space-y-4">
                  <p
                    className="text-xs uppercase tracking-widest"
                    style={{ color: "#EF4444", fontWeight: 800 }}
                  >
                    Roost Premium
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-4xl"
                      style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
                    >
                      $3
                    </span>
                    <span
                      className="text-base"
                      style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                    >
                      /month
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    Per household. Everyone benefits.
                  </p>

                  <ul className="space-y-2">
                    {PREMIUM_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: "#EF4444" }}
                        />
                        <span
                          className="text-sm"
                          style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    type="button"
                    whileTap={{ y: 2 }}
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
                    style={{
                      backgroundColor: "#EF4444",
                      border: "1.5px solid #EF4444",
                      borderBottom: "3px solid #C93B3B",
                      fontWeight: 800,
                    }}
                  >
                    {isCheckingOut ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Upgrade to Premium"
                    )}
                  </motion.button>
                </div>
              </SlabCard>
            )}

            {!isAdmin && (
              <SlabCard>
                <div className="p-5">
                  <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    Ask your household admin to upgrade to Premium for $3/month.
                  </p>
                </div>
              </SlabCard>
            )}
          </>
        )}

        {/* ---- PREMIUM ---------------------------------------------------- */}
        {isPremium && (
          <SlabCard color={isCancelled ? "#F59E0B" : "#22C55E"}>
            <div className="p-5 space-y-4">
              {/* Cancelling warning banner */}
              {isCancelled && premiumExpiresAt && (
                <div
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.10)",
                    border: "1.5px solid rgba(245,158,11,0.25)",
                  }}
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: "#F59E0B" }}
                  />
                  <div>
                    <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                      Your Premium ends on {formatDate(premiumExpiresAt)}.
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      You will lose access to all premium features after this date.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    color: "#22C55E",
                    fontWeight: 800,
                  }}
                >
                  Premium
                </div>
              </div>

              <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                Your household is on Premium.
              </p>

              <ul className="space-y-2">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: "#22C55E" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {isAdmin && (
                <div className="space-y-3 pt-2">
                  {isCancelled ? (
                    <motion.button
                      type="button"
                      whileTap={{ y: 2 }}
                      onClick={handleReactivate}
                      disabled={isReactivating}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
                      style={{
                        backgroundColor: "#22C55E",
                        border: "1.5px solid #22C55E",
                        borderBottom: "3px solid #159040",
                        fontWeight: 800,
                      }}
                    >
                      {isReactivating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Reactivate Premium"
                      )}
                    </motion.button>
                  ) : (
                    <>
                      <motion.button
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={handlePortal}
                        disabled={isPortalLoading}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
                        style={{
                          backgroundColor: "var(--roost-bg)",
                          border: "1.5px solid var(--roost-border)",
                          borderBottom: "3px solid var(--roost-border-bottom)",
                          color: "var(--roost-text-secondary)",
                          fontWeight: 700,
                        }}
                      >
                        {isPortalLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Manage payment method"
                        )}
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => setShowCancelFlow(true)}
                        className="flex w-full items-center justify-center text-sm"
                        style={{ color: "#EF4444", fontWeight: 700 }}
                      >
                        Cancel subscription
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </SlabCard>
        )}
      </motion.div>

      {/* ---- CANCEL FLOW SHEET ---------------------------------------------- */}
      <Sheet open={showCancelFlow} onOpenChange={setShowCancelFlow}>
        <SheetContent side="bottom" className="rounded-t-2xl">
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
            <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Here is what you will lose when Premium ends.
            </p>
          </SheetHeader>

          <div className="space-y-5 px-1 pb-6">
            {/* Loss list */}
            <div
              className="rounded-2xl p-4 space-y-3"
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
              <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                You will stay Premium until {formatDate(premiumExpiresAt)}. After that your household returns to the free plan.
              </p>
            )}

            {/* Keep premium */}
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

            {/* Cancel anyway */}
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
