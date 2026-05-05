export const SECTION_COLORS = {
  chores:    { base: '#EF4444', dark: '#C93B3B' },
  grocery:   { base: '#F59E0B', dark: '#C87D00' },
  calendar:  { base: '#3B82F6', dark: '#1A5CB5' },
  expenses:  { base: '#22C55E', dark: '#159040' },
  meals:     { base: '#F97316', dark: '#C4581A' },
  notes:     { base: '#A855F7', dark: '#7C28C8' },
  reminders: { base: '#06B6D4', dark: '#0891B2' },
  tasks:     { base: '#EC4899', dark: '#B02878' },
} as const

export type SectionKey = keyof typeof SECTION_COLORS
