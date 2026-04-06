"use client";

import { useState } from "react";
import { Check, MapPin, Thermometer } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { THEMES, type ThemeKey } from "@/lib/constants/themes";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useSession } from "@/lib/auth/client";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";

// ---- Helpers ----------------------------------------------------------------

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ---- Theme card -------------------------------------------------------------

function ThemeCard({
  themeKey,
  isSelected,
  onSelect,
}: {
  themeKey: ThemeKey;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const t = THEMES[themeKey];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ y: 1 }}
      className="relative flex flex-col gap-2 rounded-2xl p-3 text-left"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: isSelected
          ? "2.5px solid var(--roost-text-primary)"
          : "1.5px solid var(--roost-border)",
        borderBottom: isSelected
          ? `4px solid ${t.borderBottom}`
          : `4px solid ${t.borderBottom}`,
      }}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: t.textPrimary }}
        >
          <Check className="size-3 text-white" strokeWidth={3} />
        </span>
      )}

      {/* Mini preview */}
      <div
        className="flex h-12 w-full flex-col gap-1 overflow-hidden rounded-xl p-1.5"
        style={{ backgroundColor: t.bg }}
      >
        {/* Topbar strip */}
        <div
          className="h-2 w-full rounded-md"
          style={{
            backgroundColor: t.topbarBg,
            borderBottom: `1px solid ${t.topbarBorder}`,
          }}
        />
        {/* Surface card */}
        <div
          className="h-4 w-3/4 rounded-md"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            borderBottom: `2px solid ${t.borderBottom}`,
          }}
        />
      </div>

      {/* Theme name */}
      <span
        className="text-xs"
        style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
      >
        {t.name}
      </span>
    </motion.button>
  );
}

// ---- Section wrapper --------------------------------------------------------

function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2
          className="text-base"
          style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

// ---- Page -------------------------------------------------------------------

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: sessionData } = useSession();
  const { temperatureUnit, latitude, longitude, updatePreferences } = useUserPreferences();
  const [locationUpdating, setLocationUpdating] = useState(false);

  const themeKeys = Object.keys(THEMES) as ThemeKey[];
  const userName = sessionData?.user?.name ?? "";
  const userEmail = sessionData?.user?.email ?? "";

  async function handleTempUnitChange(unit: "fahrenheit" | "celsius") {
    try {
      await updatePreferences({ temperature_unit: unit });
      toast.success("Preference saved");
    } catch {
      toast.error("Could not save preference", { description: "Something went wrong. Try again." });
    }
  }

  function handleUpdateLocation() {
    if (!navigator.geolocation) {
      toast.error("Location not available", { description: "Your browser does not support geolocation." });
      return;
    }
    setLocationUpdating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        try {
          await updatePreferences({ latitude: lat, longitude: lon });
          toast.success("Location updated");
        } catch {
          toast.error("Could not save location", { description: "Something went wrong. Try again." });
        } finally {
          setLocationUpdating(false);
        }
      },
      (error) => {
        console.log("Location denied:", error.message);
        setLocationUpdating(false);
        toast.error("Location access was denied", {
          description: "You can enable it in your browser settings.",
        });
      },
      { timeout: 10_000 }
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex flex-col gap-8 p-4 pb-24 md:p-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <h1
        className="text-2xl md:text-3xl"
        style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
      >
        Settings
      </h1>

      {/* Profile section */}
      <SettingsSection title="Profile" subtitle="Your personal account details.">
        <div
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "4px solid var(--roost-border-bottom)",
          }}
        >
          {/* Avatar */}
          {userName && (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg text-white"
              style={{
                backgroundColor: "var(--roost-text-primary)",
                fontWeight: 800,
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
              }}
            >
              {initials(userName)}
            </div>
          )}

          {/* Name + email */}
          <div className="min-w-0 flex-1">
            {userName && (
              <p
                className="truncate text-base"
                style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
              >
                {userName}
              </p>
            )}
            {userEmail && (
              <p
                className="truncate text-sm"
                style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
              >
                {userEmail}
              </p>
            )}
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
            >
              Profile editing coming soon.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Appearance section */}
      <SettingsSection
        title="Appearance"
        subtitle="Your theme is only visible to you."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {themeKeys.map((key) => (
            <ThemeCard
              key={key}
              themeKey={key}
              isSelected={theme === key}
              onSelect={() => setTheme(key)}
            />
          ))}
        </div>
      </SettingsSection>

      {/* Preferences section */}
      <SettingsSection title="Preferences">
        <div
          className="flex flex-col divide-y rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "4px solid var(--roost-border-bottom)",
            // Dividers use the border color
            ["--tw-divide-opacity" as string]: "1",
          }}
        >
          {/* Temperature unit */}
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Thermometer className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                  Temperature
                </p>
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Choose your preferred unit for weather.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              {(["fahrenheit", "celsius"] as const).map((unit) => {
                const active = temperatureUnit === unit;
                const label = unit === "fahrenheit" ? "°F Fahrenheit" : "°C Celsius";
                return (
                  <motion.button
                    key={unit}
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => handleTempUnitChange(unit)}
                    className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                    style={{
                      backgroundColor: active ? "var(--roost-text-primary)" : "var(--roost-bg)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid var(--roost-border-bottom)",
                      color: active ? "var(--roost-surface)" : "var(--roost-text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Weather location */}
          <div className="flex items-center gap-3 p-4">
            <MapPin className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                Weather Location
              </p>
              {latitude !== null && longitude !== null ? (
                <>
                  <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    Using your current location
                  </p>
                  <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    {latitude.toFixed(2)}, {longitude.toFixed(2)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    Location not set
                  </p>
                  <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    Allow location access for accurate weather.
                  </p>
                </>
              )}
            </div>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={handleUpdateLocation}
              disabled={locationUpdating}
              className="shrink-0 h-9 rounded-xl px-3 text-sm"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-secondary)",
                fontWeight: 700,
                opacity: locationUpdating ? 0.6 : 1,
              }}
            >
              {locationUpdating ? "Updating..." : "Update"}
            </motion.button>
          </div>

          {/* Language (placeholder) */}
          <div className="flex flex-col gap-2 p-4">
            <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Language
            </p>
            <div className="flex gap-2">
              {["English", "Español"].map((lang) => {
                const active = lang === "English";
                return (
                  <motion.button
                    key={lang}
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => {
                      if (lang === "Español") {
                        toast.info("Spanish translation coming soon.");
                      }
                    }}
                    className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                    style={{
                      backgroundColor: active ? "var(--roost-text-primary)" : "var(--roost-bg)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid var(--roost-border-bottom)",
                      color: active ? "var(--roost-surface)" : "var(--roost-text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    {lang}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Household section placeholder */}
      <SettingsSection
        title="Household"
        subtitle="Manage your household and members."
      >
        <div
          className="flex min-h-14 items-center rounded-2xl px-4"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "4px solid var(--roost-border-bottom)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            Household management coming soon.
          </p>
        </div>
      </SettingsSection>
    </motion.div>
  );
}
