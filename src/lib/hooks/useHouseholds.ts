"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface HouseholdSwitcherItem {
  id: string;
  name: string;
  code: string;
  role: string;
  joinedAt: string | null;
  isActive: boolean;
  isPremium: boolean;
  subscriptionStatus: string;
}

interface HouseholdsResponse {
  activeHouseholdId: string | null;
  households: HouseholdSwitcherItem[];
}

export function useHouseholds() {
  const queryClient = useQueryClient();

  const query = useQuery<HouseholdsResponse>({
    queryKey: ["households"],
    queryFn: async () => {
      const response = await fetch("/api/household/list");
      if (!response.ok) {
        throw new Error("Failed to load households");
      }

      return response.json();
    },
    staleTime: 30_000,
    retry: 2,
  });

  const switchMutation = useMutation({
    mutationFn: async (householdId: string) => {
      const response = await fetch("/api/household/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to switch households");
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });

  const households = query.data?.households ?? [];
  const activeHousehold =
    households.find((household) => household.isActive) ?? null;
  const hasPremiumAccess = households.some((household) => household.isPremium);
  const canSwitchHouseholds = households.length > 1;
  const isSwitcherLocked = !canSwitchHouseholds && !hasPremiumAccess;

  return {
    households,
    activeHousehold,
    activeHouseholdId: query.data?.activeHouseholdId ?? null,
    hasPremiumAccess,
    canSwitchHouseholds,
    isSwitcherLocked,
    isLoading: query.isLoading,
    error: query.error,
    switchHousehold: switchMutation.mutateAsync,
    isSwitching: switchMutation.isPending,
  };
}
