'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const THEMES = {
  default: {
    '--roost-bg': '#F9FAFB',
    '--roost-surface': '#FFFFFF',
    '--roost-border': '#E5E7EB',
    '--roost-border-bottom': '#D1D5DB',
    '--roost-text-primary': '#111827',
    '--roost-text-secondary': '#374151',
    '--roost-text-muted': '#6B7280',
    '--roost-topbar-bg': '#FFFFFF',
    '--roost-topbar-border': '#E5E7EB',
    '--roost-weather-bg': 'rgba(0,0,0,0.06)',
    '--roost-weather-color': '#374151',
  },
  midnight: {
    '--roost-bg': '#111827',
    '--roost-surface': '#1F2937',
    '--roost-border': '#374151',
    '--roost-border-bottom': '#4B5563',
    '--roost-text-primary': '#F9FAFB',
    '--roost-text-secondary': '#E5E7EB',
    '--roost-text-muted': '#9CA3AF',
    '--roost-topbar-bg': '#1F2937',
    '--roost-topbar-border': '#374151',
    '--roost-weather-bg': 'rgba(255,255,255,0.1)',
    '--roost-weather-color': '#E5E7EB',
  },
} as const

type ThemeKey = keyof typeof THEMES

function applyTheme(key: ThemeKey) {
  if (typeof document === 'undefined') return
  const vars = THEMES[key] ?? THEMES.default
  const root = document.documentElement
  for (const [prop, val] of Object.entries(vars)) {
    root.style.setProperty(prop, val)
  }
  root.setAttribute('data-theme', key)
  root.setAttribute('data-dark', key === 'midnight' ? 'true' : 'false')

  // Shadcn overrides
  root.style.setProperty('--background', key === 'midnight' ? '222 47% 11%' : '0 0% 100%')
  root.style.setProperty('--card', key === 'midnight' ? '217 33% 17%' : '0 0% 100%')
  root.style.setProperty('--card-foreground', key === 'midnight' ? '210 40% 98%' : '222 47% 11%')
  root.style.setProperty('--foreground', key === 'midnight' ? '210 40% 98%' : '222 47% 11%')
  root.style.setProperty('--border', key === 'midnight' ? '217 33% 27%' : '214 32% 91%')
  root.style.setProperty('--input', key === 'midnight' ? '217 33% 27%' : '214 32% 91%')
  root.style.setProperty('--primary', key === 'midnight' ? '210 40% 90%' : '222 47% 11%')
  root.style.setProperty('--primary-foreground', key === 'midnight' ? '222 47% 11%' : '210 40% 98%')
  root.style.setProperty('--muted', key === 'midnight' ? '217 33% 17%' : '210 40% 96%')
  root.style.setProperty('--muted-foreground', key === 'midnight' ? '215 20% 65%' : '215 16% 47%')
  root.style.setProperty('--popover', key === 'midnight' ? '217 33% 17%' : '0 0% 100%')
  root.style.setProperty('--popover-foreground', key === 'midnight' ? '210 40% 98%' : '222 47% 11%')
}

interface ThemeContextValue {
  theme: ThemeKey
  setTheme: (key: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'default',
  setTheme: async () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: string
  children: React.ReactNode
}) {
  const resolved = (THEMES[initialTheme as ThemeKey] ? initialTheme : 'default') as ThemeKey
  const [theme, setThemeState] = useState<ThemeKey>(resolved)

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  const setTheme = useCallback(async (key: string) => {
    const next = (THEMES[key as ThemeKey] ? key : 'default') as ThemeKey
    applyTheme(next)
    setThemeState(next)
    await fetch('/api/user/theme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: next }),
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
