export const BRAND_RED = '#EF4444'
export const BRAND_RED_DARK = '#C93B3B'
export const SIDEBAR_RED = '#DC2626'

export const SECTION_COLORS = {
  chores: '#EF4444',
  grocery: '#F59E0B',
  calendar: '#3B82F6',
  expenses: '#22C55E',
  meals: '#F97316',
  notes: '#A855F7',
  reminders: '#06B6D4',
  tasks: '#EC4899',
  stats: '#6366F1',
  rewards: '#A855F7',
} as const

export const SECTION_DARK_COLORS = {
  chores: '#C93B3B',
  grocery: '#C87D00',
  calendar: '#1A5CB5',
  expenses: '#159040',
  meals: '#C4581A',
  notes: '#7C28C8',
  reminders: '#0891B2',
  tasks: '#B02878',
  stats: '#4F46E5',
  rewards: '#7C28C8',
} as const

export type SectionKey = keyof typeof SECTION_COLORS
