/**
 * PLAN LIMITS & PREMIUM FEATURE MATRIX — single source of truth.
 *
 * Edit the numbers/flags below to tune what Free vs Premium households get.
 * Use `Infinity` for "unlimited" (Premium countable limits should almost
 * always be `Infinity`).
 *
 * Enforcement status:
 *   - ENFORCED FROM THIS FILE today: `chores` (server: POST /api/chores,
 *     client: chores page Add button).
 *   - The other numbers/flags are the SOURCE OF TRUTH for reference and
 *     tracking, but some features still read their own local constants in
 *     their route (e.g. notes = FREE_NOTES_LIMIT). The accurate current
 *     values are mirrored here. Migrating those routes to import from this
 *     file is a follow-up so this file becomes the only knob.
 */

export type PlanTier = 'free' | 'premium'

/**
 * Countable limits per tier. A household hits its cap when its current count
 * is >= the value here. `Infinity` means no cap.
 */
export const PLAN_LIMITS = {
  free: {
    chores: 10,
    notes: 10,
    members: 5,
    children: 1,
    householdsPerUser: 1,
    groceryLists: 1,
    calendarEventsPerMonth: 20,
  },
  premium: {
    chores: Infinity,
    notes: Infinity,
    members: Infinity,
    children: Infinity,
    householdsPerUser: Infinity,
    groceryLists: Infinity,
    calendarEventsPerMonth: Infinity,
  },
} as const

export type PlanLimitKey = keyof typeof PLAN_LIMITS['free']

/**
 * Premium feature flags. `true` = that tier can use the feature.
 * Everything here is Premium-only today (free: false, premium: true), but the
 * shape lets you flip a feature on for Free by changing its `free` value.
 */
export const FEATURE_ACCESS = {
  // Chores
  recurringChores: { free: false, premium: true }, // non-daily frequency (weekly/biweekly/monthly)
  choreLeaderboard: { free: false, premium: true },
  choreHistory: { free: false, premium: true }, // NOTE: feature not built yet — see GitHub issue
  rewards: { free: false, premium: true },
  customChoreCategories: { free: false, premium: true },
  // Calendar
  recurringEvents: { free: false, premium: true },
  // Reminders
  recurringReminders: { free: false, premium: true },
  // Notes
  richTextNotes: { free: false, premium: true },
  // Grocery
  multipleGroceryLists: { free: false, premium: true },
  // Money
  expenseTracking: { free: false, premium: true },
  budgets: { free: false, premium: true },
  insights: { free: false, premium: true },
  receiptScanning: { free: false, premium: true },
  recurringExpenses: { free: false, premium: true },
  export: { free: false, premium: true }, // CSV/PDF expense export
  // Meals
  unlimitedMealBank: { free: false, premium: true },
  // Household
  householdStats: { free: false, premium: true },
  guestMembers: { free: false, premium: true },
  multipleHouseholds: { free: false, premium: true },
} as const

export type FeatureKey = keyof typeof FEATURE_ACCESS

/** Map a boolean premium state to a tier key. */
export function tierFor(isPremium: boolean): PlanTier {
  return isPremium ? 'premium' : 'free'
}

/** The countable limit for a tier (a number, possibly `Infinity`). */
export function planLimit(tier: PlanTier, key: PlanLimitKey): number {
  return PLAN_LIMITS[tier][key]
}

/** Whether a tier can use a premium feature. */
export function hasFeature(tier: PlanTier, feature: FeatureKey): boolean {
  return FEATURE_ACCESS[feature][tier]
}
