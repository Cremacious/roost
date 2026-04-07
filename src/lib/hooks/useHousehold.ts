"use client";

import { useQuery } from "@tanstack/react-query";

interface HouseholdData {
  household: {
    id: string;
    name: string;
    code: string;
    subscription_status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    premium_expires_at: string | null;
    created_by: string | null;
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

  return {
    household: data?.household,
    role: data?.role,
    permissions: data?.permissions ?? [],
    isPremium,
    isCancelled,
    stripeCustomerId: data?.household?.stripe_customer_id ?? null,
    stripeSubscriptionId: data?.household?.stripe_subscription_id ?? null,
    premiumExpiresAt,
    isLoading,
    error,
  };
}
