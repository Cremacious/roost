export const FREE_TIER_LIMITS = {
  members: 5,
  children: 2,
  chores: 5,
  tasks: 10,
  calendarEvents: 20,
  notes: 10,
  reminders: 5,
  mealBank: 5,
  groceryLists: 1,
  receiptScansPerMonth: 75,
} as const

export const PREMIUM_TIER_LIMITS = {
  members: 20,
  children: 10,
  chores: Infinity,
  tasks: Infinity,
  calendarEvents: Infinity,
  notes: Infinity,
  reminders: Infinity,
  mealBank: Infinity,
  groceryLists: Infinity,
  receiptScansPerMonth: Infinity,
} as const

export type FreeTierLimitKey = keyof typeof FREE_TIER_LIMITS
