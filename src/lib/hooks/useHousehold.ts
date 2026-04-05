"use client";

import { useQuery } from "@tanstack/react-query";

interface HouseholdData {
  household: {
    id: string;
    name: string;
    code: string;
    subscription_status: string;
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

  return {
    household: data?.household,
    role: data?.role,
    permissions: data?.permissions ?? [],
    isPremium: data?.household?.subscription_status === "premium",
    isLoading,
    error,
  };
}
