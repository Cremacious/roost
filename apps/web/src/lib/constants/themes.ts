export const THEMES = {
  default: {
    name: 'Default',
    dark: false,
    bg: '#F9FAFB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    borderBottom: '#D1D5DB',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#6B7280',
    topbarBg: '#FFFFFF',
    topbarBorder: '#E5E7EB',
  },
  midnight: {
    name: 'Midnight',
    dark: true,
    bg: '#111827',
    surface: '#1F2937',
    border: '#374151',
    borderBottom: '#4B5563',
    textPrimary: '#F9FAFB',
    textSecondary: '#E5E7EB',
    textMuted: '#9CA3AF',
    topbarBg: '#1F2937',
    topbarBorder: '#374151',
  },
} as const

export type ThemeKey = keyof typeof THEMES
