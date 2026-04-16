"use client";

// Note: navigator.geolocation requires HTTPS in production.
// Works on localhost for dev. Vercel deployment uses HTTPS automatically.

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Lock,
  Sun,
  Wind,
} from "lucide-react";
import RoostLogo from "@/components/shared/RoostLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHouseholds } from "@/lib/hooks/useHouseholds";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { Skeleton } from "@/components/ui/skeleton";

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ---- Component --------------------------------------------------------------

export default function TopBar() {
  const isClient = useIsClient();
  const [time, setTime] = useState<string>("");
  const locationRequested = useRef(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { temperatureUnit, latitude, longitude, isLoading: prefsLoading } = useUserPreferences();
  const {
    activeHousehold,
    canSwitchHouseholds,
    hasPremiumAccess,
    households,
    isLoading: householdsLoading,
    isSwitcherLocked,
    isSwitching,
    switchHousehold,
  } = useHouseholds();

  // ---- Clock ------------------------------------------------------------------

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()));
    tick();
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

    if (latitude !== null) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const unit = tz.startsWith("America/") ? "fahrenheit" : "celsius";

        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            temperature_unit: unit,
          }),
        }).catch(() => {});

        queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      },
      (error) => {
        console.log("Location denied:", error.message);
      },
      { timeout: 10_000 }
    );
  }, [prefsLoading, latitude, queryClient]);

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
    refetchOnWindowFocus: false,
    retry: false,
  });

  const householdName = activeHousehold?.name ?? "";
  const weather = weatherData?.current_weather;
  async function handleSwitchHousehold(householdId: string) {
    if (householdId === activeHousehold?.id) return;

    await switchHousehold(householdId);
    router.push("/dashboard");
    router.refresh();
  }
  const unitLabel = temperatureUnit === "fahrenheit" ? "°F" : "°C";

  return (
    <header
      className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b px-4 md:left-55 bg-[#C0160C] md:bg-(--roost-topbar-bg)"
      style={{
        borderBottomColor: "var(--roost-topbar-border)",
      }}
    >
      {/* Left: logo on mobile, household name on md+ */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="md:hidden">
          <RoostLogo size="sm" variant="white" />
        </div>
        <div className="hidden md:block">
          {householdsLoading ? (
            <Skeleton className="h-9 w-44 rounded-xl" />
          ) : isSwitcherLocked ? (
            <div
              className="flex h-9 items-center gap-2 rounded-xl px-3"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
              }}
            >
              <span
                className="max-w-48 truncate text-base"
                style={{ fontWeight: 800 }}
              >
                {householdName || "\u00A0"}
              </span>
              <Lock
                className="size-3.5"
                style={{ color: "var(--roost-text-muted)" }}
              />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isSwitching}
                  className="flex h-9 items-center gap-2 rounded-xl px-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-primary)",
                  }}
                >
                  <span
                    className="max-w-48 truncate text-base"
                    style={{ fontWeight: 800 }}
                  >
                    {householdName || "\u00A0"}
                  </span>
                  <ChevronDown
                    className="size-4"
                    style={{ color: "var(--roost-text-muted)" }}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="rounded-xl"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  color: "var(--roost-text-primary)",
                  border: "1.5px solid var(--roost-border)",
                }}
              >
                <DropdownMenuLabel>Households</DropdownMenuLabel>
                {households.map((household) => (
                  <DropdownMenuItem
                    key={household.id}
                    onClick={() => handleSwitchHousehold(household.id)}
                    disabled={isSwitching || household.isActive}
                    className="rounded-lg px-2 py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm" style={{ fontWeight: 700 }}>
                          {household.name}
                        </p>
                        <p
                          className="truncate text-xs"
                          style={{
                            color: "var(--roost-text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          {household.isPremium ? "Premium" : "Free"} · {household.role}
                        </p>
                      </div>
                      {household.isActive && (
                        <span
                          className="rounded-md px-2 py-0.5 text-[11px]"
                          style={{
                            backgroundColor: "#22C55E20",
                            color: "#15803D",
                            fontWeight: 800,
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                {!canSwitchHouseholds && hasPremiumAccess && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="rounded-lg px-2 py-2">
                      <span
                        style={{
                          color: "var(--roost-text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        Join or create another household to switch here. You can also add one from Settings.
                      </span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Right: weather chip + time */}
      <div className="flex items-center gap-3">
        {/* Weather chip — mobile (white on red) */}
        <div className="md:hidden">
          {!isClient ? (
            <Skeleton className="h-7 w-20 rounded-full opacity-40" />
          ) : weatherLoading ? (
            <Skeleton className="h-7 w-20 rounded-full opacity-40" />
          ) : weather ? (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
              style={{
                backgroundColor: "rgba(255,255,255,0.18)",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              {getWeatherIcon(weather.weathercode)}
              <span>
                {Math.round(weather.temperature)}{unitLabel}
              </span>
            </div>
          ) : null}
        </div>

        {/* Weather chip — desktop (themed) */}
        <div className="hidden md:block">
          {!isClient ? (
            <Skeleton className="h-7 w-20 rounded-full" />
          ) : weatherLoading ? (
            <Skeleton className="h-7 w-20 rounded-full" />
          ) : weather ? (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
              style={{
                backgroundColor: "var(--roost-weather-bg)",
                color: "var(--roost-weather-color)",
                fontWeight: 700,
              }}
            >
              {getWeatherIcon(weather.weathercode)}
              <span>
                {Math.round(weather.temperature)}{unitLabel}
              </span>
            </div>
          ) : null}
        </div>

        {/* Time */}
        <span
          className="hidden tabular-nums sm:block text-[13px] text-white md:text-(--roost-text-muted)"
          style={{ fontWeight: 700 }}
          suppressHydrationWarning
        >
          {isClient ? time : ""}
        </span>
      </div>
    </header>
  );
}
