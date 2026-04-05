"use client";

import { Check } from "lucide-react";
import { THEMES, type ThemeKey } from "@/lib/constants/themes";
import { useTheme } from "@/components/providers/ThemeProvider";

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
    <button
      type="button"
      onClick={onSelect}
      className="relative flex flex-col gap-2 rounded-2xl p-3 text-left transition-all"
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
          style={{ backgroundColor: t.topbarBg, borderBottom: `1px solid ${t.topbarBorder}` }}
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
        className="text-xs font-semibold"
        style={{ color: "var(--roost-text-primary)" }}
      >
        {t.name}
      </span>
    </button>
  );
}

// ---- Page -------------------------------------------------------------------

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const themeKeys = Object.keys(THEMES) as ThemeKey[];

  return (
    <div
      className="flex flex-col gap-6 p-4 pb-24 md:p-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      {/* Page title */}
      <h1
        className="text-xl font-bold"
        style={{ color: "var(--roost-text-primary)" }}
      >
        Settings
      </h1>

      {/* Appearance section */}
      <section className="flex flex-col gap-3">
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--roost-text-primary)" }}
          >
            Appearance
          </h2>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--roost-text-muted)" }}
          >
            Your theme is only visible to you.
          </p>
        </div>

        {/* Theme grid */}
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
      </section>
    </div>
  );
}
