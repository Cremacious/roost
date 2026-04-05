"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { THEMES, DEFAULT_THEME, type ThemeKey } from "@/lib/constants/themes";
import { useThemeStore } from "@/lib/store/themeStore";

// ---- Apply theme ------------------------------------------------------------

export function applyTheme(key: ThemeKey) {
  const theme = THEMES[key];
  const root = document.documentElement;

  // Roost theme variables
  root.style.setProperty("--roost-bg", theme.bg);
  root.style.setProperty("--roost-surface", theme.surface);
  root.style.setProperty("--roost-border", theme.border);
  root.style.setProperty("--roost-border-bottom", theme.borderBottom);
  root.style.setProperty("--roost-text-primary", theme.textPrimary);
  root.style.setProperty("--roost-text-secondary", theme.textSecondary);
  root.style.setProperty("--roost-text-muted", theme.textMuted);
  root.style.setProperty("--roost-topbar-bg", theme.topbarBg);
  root.style.setProperty("--roost-topbar-border", theme.topbarBorder);

  // Override shadcn/Tailwind variables so existing classes respond to theme
  root.style.setProperty("--background", theme.bg);
  root.style.setProperty("--foreground", theme.textPrimary);
  root.style.setProperty("--card", theme.surface);
  root.style.setProperty("--card-foreground", theme.textPrimary);
  root.style.setProperty("--popover", theme.surface);
  root.style.setProperty("--popover-foreground", theme.textPrimary);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--input", theme.border);
  root.style.setProperty("--muted", theme.surface);
  root.style.setProperty("--muted-foreground", theme.textMuted);
  root.style.setProperty("--secondary", theme.surface);
  root.style.setProperty("--secondary-foreground", theme.textSecondary);
  root.style.setProperty("--sidebar", theme.surface);
  root.style.setProperty("--sidebar-foreground", theme.textPrimary);
  root.style.setProperty("--sidebar-border", theme.border);

  // Toggle dark class for shadcn dark: Tailwind variants
  if (theme.dark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// ---- useTheme hook ----------------------------------------------------------

export function useTheme() {
  const { theme, setTheme: setThemeStore } = useThemeStore();

  const setTheme = async (key: ThemeKey) => {
    applyTheme(key);
    setThemeStore(key);
    try {
      const res = await fetch("/api/user/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: key }),
      });
      if (res.ok) {
        toast.success("Theme updated");
      }
    } catch {
      // non-critical — theme is already applied visually
    }
  };

  return { theme, setTheme };
}

// ---- Provider ---------------------------------------------------------------

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme: ThemeKey;
}

export default function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const setThemeStore = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    const theme = initialTheme ?? DEFAULT_THEME;
    setThemeStore(theme);
    applyTheme(theme);
  }, [initialTheme, setThemeStore]);

  return <>{children}</>;
}
