export type ThemeKey = 'default' | 'midnight'

export const DEFAULT_THEME: ThemeKey = 'default'

export const THEMES: Record<ThemeKey, Theme> = {
  default: {
    name: 'Default',
    bg: '#F9FAFB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    borderBottom: '#D1D5DB',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#6B7280',
    topbarBg: '#FFFFFF',
    topbarBorder: '#E5E7EB',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '#E5E7EB',
    sidebarActiveBg: '#F3F4F6',
    sidebarActiveText: '#111827',
    sidebarInactiveText: '#6B7280',
    sidebarDivider: '#E5E7EB',
    weatherBg: 'rgba(0,0,0,0.05)',
    weatherColor: '#374151',
    dark: false,
  },
  midnight: {
    name: 'Midnight',
    bg: '#111827',
    surface: '#1F2937',
    border: '#374151',
    borderBottom: '#4B5563',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    topbarBg: '#1F2937',
    topbarBorder: '#374151',
    sidebarBg: '#1F2937',
    sidebarBorder: '#374151',
    sidebarActiveBg: '#374151',
    sidebarActiveText: '#F9FAFB',
    sidebarInactiveText: '#9CA3AF',
    sidebarDivider: '#374151',
    weatherBg: 'rgba(255,255,255,0.08)',
    weatherColor: '#D1D5DB',
    dark: true,
  },
}

export interface Theme {
  name: string
  bg: string
  surface: string
  border: string
  borderBottom: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  topbarBg: string
  topbarBorder: string
  sidebarBg: string
  sidebarBorder: string
  sidebarActiveBg: string
  sidebarActiveText: string
  sidebarInactiveText: string
  sidebarDivider: string
  weatherBg: string
  weatherColor: string
  dark: boolean
}
