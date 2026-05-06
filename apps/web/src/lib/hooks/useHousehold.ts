"use client";

import { useQuery } from "@tanstack/react-query";

export interface StatsVisibility {
  leaderboard: boolean;
  chores: boolean;
  expenses: boolean;
  tasks: boolean;
  meals: boolean;
  grocery: boolean;
}

export const DEFAULT_STATS_VISIBILITY: StatsVisibility = {
  leaderboard: true,
  chores: true,
  expenses: true,
  tasks: true,
  meals: true,
  grocery: true,
};

interface HouseholdData {
  household: {
    id: string;
    name: string;
    code: string;
    subscription_status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    premium_expires_at: string | null;
    stats_visibility: string | null;
  };
  role: string;
  permissions: string[];
}

export function useHousehold() {
  const { data, isLoading, error } = useQuery<HouseholdData>({
    queryKey: ["household"],
    queryFn: async () => {
      const res = await fetch("/api/household/me");
      if (!res.ok) throw new Error("Failed to fetch household");
      return res.json();
    },
    staleTime: 30_000,
    retry: 2,
  });

  const subscriptionStatus = data?.household?.subscription_status;
  const premiumExpiresAt = data?.household?.premium_expires_at ?? null;

  // Premium if status is "premium" AND not yet expired
  const isPremium =
    subscriptionStatus === "premium" &&
    (premiumExpiresAt === null || new Date(premiumExpiresAt) > new Date());

  // Cancelled = premium but has an expiry date set (cancel_at_period_end)
  const isCancelled =
    subscriptionStatus === "premium" &&
    premiumExpiresAt !== null &&
    new Date(premiumExpiresAt) > new Date();

  // Parse statsVisibility JSON — falls back to all-visible defaults
  let statsVisibility: StatsVisibility = { ...DEFAULT_STATS_VISIBILITY };
  const rawVisibility = data?.household?.stats_visibility;
  if (rawVisibility) {
    try {
      const parsed = JSON.parse(rawVisibility) as Partial<StatsVisibility>;
      statsVisibility = { ...DEFAULT_STATS_VISIBILITY, ...parsed };
    } catch {
      // malformed JSON → use defaults
    }
  }

  return {
    household: data?.household,
    role: data?.role,
    permissions: data?.permissions ?? [],
    isPremium,
    isCancelled,
    stripeCustomerId: data?.household?.stripe_customer_id ?? null,
    stripeSubscriptionId: data?.household?.stripe_subscription_id ?? null,
    premiumExpiresAt,
    statsVisibility,
    isLoading,
    error,
  };
}
