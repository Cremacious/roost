"use client";

// Note: navigator.geolocation requires HTTPS in production.
// Works on localhost for dev. Vercel deployment uses HTTPS automatically.

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
} from "lucide-react";
import RoostLogo from "@/components/shared/RoostLogo";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import { Skeleton } from "@/components/ui/skeleton";

// ---- Types ------------------------------------------------------------------

interface Member {
  id: string;
  userId: string;
  name: string;
  avatarColor: string | null;
}

interface MembersResponse {
  household: { id: string; name: string };
  members: Member[];
}

interface WeatherResponse {
  current_weather: { temperature: number; weathercode: number };
}

// ---- Helpers ----------------------------------------------------------------

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="size-3.5" />;
  if (code <= 3) return <Cloud className="size-3.5" />;
  if (code <= 48) return <Wind className="size-3.5" />;
  if (code <= 67) return <CloudRain className="size-3.5" />;
  if (code <= 77) return <CloudSnow className="size-3.5" />;
  if (code <= 82) return <CloudRain className="size-3.5" />;
  if (code <= 86) return <CloudSnow className="size-3.5" />;
  return <CloudLightning className="size-3.5" />;
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ---- Component --------------------------------------------------------------

export default function TopBar() {
  const [time, setTime] = useState<string>(() => formatTime(new Date()));
  const locationRequested = useRef(false);
  const queryClient = useQueryClient();

  const { temperatureUnit, latitude, longitude, isLoading: prefsLoading } = useUserPreferences();

  // ---- Clock ------------------------------------------------------------------

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()));
    const id = setInterval(tick, 60_000);
    const ms = (60 - new Date().getSeconds()) * 1000;
    const align = setTimeout(() => { tick(); setInterval(tick, 60_000); }, ms);
    return () => { clearInterval(id); clearTimeout(align); };
  }, []);

  // ---- Location detection (first mount, only if no stored location) ----------

  useEffect(() => {
    if (prefsLoading) return;
    if (locationRequested.current) return;
    locationRequested.current = true;

    if (latitude !== null) return; // Already have stored location
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;

        // Save location
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lon }),
        }).catch(() => {});

        // Auto-detect unit on first location grant using browser timezone
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const unit = tz.startsWith("America/") ? "fahrenheit" : "celsius";
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ temperature_unit: unit }),
        }).catch(() => {});

        // Refresh preferences so weather query picks up new coords + unit
        queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      },
      (error) => {
        console.log("Location denied:", error.message);
      },
      { timeout: 10_000 }
    );
  }, [prefsLoading, latitude, queryClient]);

  // ---- Household members -------------------------------------------------------

  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const r = await fetch("/api/household/members");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load members");
      }
      return r.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  // ---- Weather ----------------------------------------------------------------

  const effectiveLat = latitude ?? 28.5;
  const effectiveLon = longitude ?? -81.4;

  const weatherUrl =
    temperatureUnit === "fahrenheit"
      ? `https://api.open-meteo.com/v1/forecast?latitude=${effectiveLat}&longitude=${effectiveLon}&current_weather=true&temperature_unit=fahrenheit`
      : `https://api.open-meteo.com/v1/forecast?latitude=${effectiveLat}&longitude=${effectiveLon}&current_weather=true`;

  const { data: weatherData, isLoading: weatherLoading } = useQuery<WeatherResponse>({
    queryKey: ["weather", effectiveLat, effectiveLon, temperatureUnit],
    queryFn: () => fetch(weatherUrl).then((r) => r.json()),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
  });

  const members = membersData?.members ?? [];
  const householdName = membersData?.household?.name ?? "";
  const weather = weatherData?.current_weather;
  const unitLabel = temperatureUnit === "fahrenheit" ? "°F" : "°C";
  const visibleMembers = members.slice(0, 4);
  const overflow = members.length > 4 ? members.length - 4 : 0;

  return (
    <header
      className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b px-4 md:left-55"
      style={{
        backgroundColor: "var(--roost-topbar-bg)",
        borderBottomColor: "var(--roost-topbar-border)",
      }}
    >
      {/* Left: logo on mobile, household name on md+ */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="md:hidden">
          <RoostLogo size="sm" />
        </div>
        <span
          className="text-base truncate max-w-40"
          style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
        >
          {householdName || "\u00A0"}
        </span>
      </div>

      {/* Right: weather chip + time + avatars */}
      <div className="flex items-center gap-2">
        {/* Weather chip */}
        {weatherLoading ? (
          <Skeleton className="h-6 w-20 rounded-full" />
        ) : weather ? (
          <div
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            style={{
              backgroundColor: "var(--roost-border)",
              color: "var(--roost-text-secondary)",
              fontWeight: 600,
            }}
          >
            {getWeatherIcon(weather.weathercode)}
            <span>
              {Math.round(weather.temperature)}
              {unitLabel}
            </span>
          </div>
        ) : null}

        {/* Time */}
        <span
          className="hidden text-sm tabular-nums sm:block"
          style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
        >
          {time}
        </span>

        {/* Member avatars */}
        {members.length > 0 && (
          <div className="flex -space-x-2">
            {visibleMembers.map((m) => (
              <div
                key={m.id}
                title={m.name}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold text-white"
                style={{
                  background: m.avatarColor ?? "#6366f1",
                  borderColor: "var(--roost-topbar-bg)",
                }}
              >
                {initials(m.name)}
              </div>
            ))}
            {overflow > 0 && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold"
                style={{
                  backgroundColor: "var(--roost-border)",
                  borderColor: "var(--roost-topbar-bg)",
                  color: "var(--roost-text-secondary)",
                }}
              >
                +{overflow}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
