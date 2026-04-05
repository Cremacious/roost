import { create } from "zustand";
import { DEFAULT_THEME, type ThemeKey } from "@/lib/constants/themes";

interface ThemeStore {
  theme: ThemeKey;
  setTheme: (key: ThemeKey) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: DEFAULT_THEME,
  setTheme: (key) => set({ theme: key }),
}));
