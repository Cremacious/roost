export const CALENDAR_CATEGORIES = [
  { slug: 'medical',       label: 'Medical',       color: '#EF4444' },
  { slug: 'school',        label: 'School',         color: '#3B82F6' },
  { slug: 'work',          label: 'Work',           color: '#8B5CF6' },
  { slug: 'sports',        label: 'Sports',         color: '#F97316' },
  { slug: 'family',        label: 'Family',         color: '#22C55E' },
  { slug: 'social',        label: 'Social',         color: '#EC4899' },
  { slug: 'travel',        label: 'Travel',         color: '#06B6D4' },
  { slug: 'food',          label: 'Food',           color: '#EAB308' },
  { slug: 'entertainment', label: 'Entertainment',  color: '#A855F7' },
  { slug: 'other',         label: 'Other',          color: '#94A3B8' },
] as const

export type CalendarCategorySlug = typeof CALENDAR_CATEGORIES[number]['slug']

export function getCategoryColor(slug: string | null | undefined): string {
  if (!slug) return '#3B82F6'
  return CALENDAR_CATEGORIES.find(c => c.slug === slug)?.color ?? '#3B82F6'
}
