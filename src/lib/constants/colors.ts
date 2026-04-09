export const SECTION_COLORS = {
  chores:    "#EF4444",
  grocery:   "#F59E0B",
  calendar:  "#3B82F6",
  expenses:  "#22C55E",
  meals:     "#F97316",
  notes:     "#A855F7",
  reminders: "#06B6D4",
  tasks:     "#EC4899",
  stats:     "#6366F1",
} as const;

export type SectionKey = keyof typeof SECTION_COLORS;
