// Free-tier limits, enforced server-side. The single source of truth for how
// much a free household can create before hitting a premium gate. Premium
// households are unbounded. Values mirror the product spec in CLAUDE.md.
//
// NOTE: only the limits that are actually wired into an API route are enforced.
// calendarEventsPerMonth is enforced in POST /api/calendar.

export const FREE_TIER_LIMITS = {
  members: 5,
  children: 1,
  chores: 5,
  tasks: 10,
  calendarEventsPerMonth: 20,
  notes: 10,
  activeSingleReminders: 5,
  mealBank: 5,
  groceryLists: 1,
} as const

export type FreeTierLimitKey = keyof typeof FREE_TIER_LIMITS
