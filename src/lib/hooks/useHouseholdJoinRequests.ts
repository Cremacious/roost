"use client";

import { useQuery } from "@tanstack/react-query";

export interface IncomingJoinRequest {
  id: string;
  householdId: string;
  householdName: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string | null;
  createdAt: string;
}

export interface OutgoingJoinRequest {
  id: string;
  householdId: string;
  householdName: string;
  createdAt: string;
}

export interface HouseholdJoinRequestsResponse {
  isAdmin: boolean;
  incoming: IncomingJoinRequest[];
  outgoing: OutgoingJoinRequest[];
}

export function useHouseholdJoinRequests() {
  return useQuery<HouseholdJoinRequestsResponse>({
    queryKey: ["household-join-requests"],
    queryFn: async () => {
      const response = await fetch("/api/household/join-requests");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load join requests");
      }

      return response.json();
    },
    staleTime: 15_000,
    retry: 1,
  });
}
