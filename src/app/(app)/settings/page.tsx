"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { THEMES, type ThemeKey } from "@/lib/constants/themes";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useSession } from "@/lib/auth/client";

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

  const themeKeys = Object.keys(THEMES) as ThemeKey[];
  const userName = sessionData?.user?.name ?? "";
  const userEmail = sessionData?.user?.email ?? "";

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
