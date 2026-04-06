"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export type UserPreferences = {
  temperature_unit: "fahrenheit" | "celsius";
  // Drizzle numeric columns return as strings from Postgres
  latitude: string | null;
  longitude: string | null;
  timezone: string;
  language: string;
  theme: string;
};

export function useUserPreferences() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UserPreferences>({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      return res.json();
    },
    staleTime: 60_000,
    retry: 2,
  });

  const updatePreferences = async (
    updates: Partial<Omit<UserPreferences, "latitude" | "longitude"> & { latitude?: number; longitude?: number }>
  ): Promise<UserPreferences> => {
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update preferences");
    const updated: UserPreferences = await res.json();
    queryClient.setQueryData<UserPreferences>(["user-preferences"], updated);
    return updated;
  };

  return {
    preferences: data,
    temperatureUnit: (data?.temperature_unit ?? "fahrenheit") as "fahrenheit" | "celsius",
    // Parse numeric strings to numbers for convenience
    latitude: data?.latitude != null ? parseFloat(data.latitude) : null,
    longitude: data?.longitude != null ? parseFloat(data.longitude) : null,
    isLoading,
    updatePreferences,
  };
}
