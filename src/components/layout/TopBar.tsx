"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
} from "lucide-react";

// ---- Types ----------------------------------------------------------------

interface Member {
  id: string;
  userId: string;
  name: string;
  avatarColor: string | null;
}

interface HouseholdInfo {
  id: string;
  name: string;
}

interface MembersResponse {
  household: HouseholdInfo;
  members: Member[];
}

interface WeatherResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
}

// ---- Helpers ----------------------------------------------------------------

const WEATHER_LAT = 28.5;
const WEATHER_LON = -81.4;

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="size-4" />;
  if (code <= 3) return <Cloud className="size-4" />;
  if (code <= 48) return <Wind className="size-4" />;
  if (code <= 67) return <CloudRain className="size-4" />;
  if (code <= 77) return <CloudSnow className="size-4" />;
  if (code <= 82) return <CloudRain className="size-4" />;
  if (code <= 86) return <CloudSnow className="size-4" />;
  return <CloudLightning className="size-4" />;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ---- Component --------------------------------------------------------------

export default function TopBar() {
  const [time, setTime] = useState<string>(() => formatTime(new Date()));

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()));
    const id = setInterval(tick, 60_000);
    const ms = (60 - new Date().getSeconds()) * 1000;
    const align = setTimeout(() => { tick(); setInterval(tick, 60_000); }, ms);
    return () => { clearInterval(id); clearTimeout(align); };
  }, []);

  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: () => fetch("/api/household/members").then((r) => r.json()),
    staleTime: 60_000,
    retry: false,
  });

  const { data: weatherData } = useQuery<WeatherResponse>({
    queryKey: ["weather"],
    queryFn: () =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true`
      ).then((r) => r.json()),
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: false,
  });

  const members = membersData?.members ?? [];
  const householdName = membersData?.household.name ?? "";
  const weather = weatherData?.current_weather;

  const visibleMembers = members.slice(0, 4);
  const overflow = members.length > 4 ? members.length - 4 : 0;

  return (
    <header
      className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b px-4 md:left-18"
      style={{
        backgroundColor: "var(--roost-topbar-bg)",
        borderBottomColor: "var(--roost-topbar-border)",
      }}
    >
      {/* Left: household name */}
      <span
        className="text-base font-semibold truncate max-w-45"
        style={{ color: "var(--roost-text-primary)" }}
      >
        {householdName || "\u00A0"}
      </span>

      {/* Right: weather + time + avatars */}
      <div className="flex items-center gap-3">
        {/* Weather */}
        {weather && (
          <div
            className="flex items-center gap-1 text-sm"
            style={{ color: "var(--roost-text-secondary)" }}
          >
            {getWeatherIcon(weather.weathercode)}
            <span>{Math.round(weather.temperature)}&deg;</span>
          </div>
        )}

        {/* Time */}
        <span
          className="text-sm tabular-nums"
          style={{ color: "var(--roost-text-secondary)" }}
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
