export const FREE_TIER_LIMITS = {
  chores: 5,
  tasks: 10,
  calendarEvents: 20,
  notes: 10,
  reminders: 5,
  mealBank: 5,
  members: 5,
  children: 2,
  groceryLists: 1,
} as const;

export const PREMIUM_TIER_LIMITS = {
  chores: Infinity,
  tasks: Infinity,
  calendarEvents: Infinity,
  notes: Infinity,
  reminders: Infinity,
  mealBank: Infinity,
  members: Infinity,
  children: Infinity,
  groceryLists: Infinity,
} as const;

// Feature flags — true = premium only, false = available on free tier
export const PREMIUM_FEATURES = {
  // Full module gates
  expenses: true,
  receiptScanning: true,
  expenseExport: true,
  expenseInsights: true,
  expenseBudgets: true,
  recurringExpenses: true,

  // Chores
  recurringChores: true,
  choreLeaderboard: true,
  choreHistory: true,

  // Calendar
  recurringEvents: true,

  // Reminders
  recurringReminders: true,
  remindHousehold: true,
  remindSpecificMember: true,

  // Grocery
  multipleGroceryLists: true,

  // Meals
  mealSuggestions: true,
  mealGroceryIntegration: true,

  // Allowances
  allowances: true,

  // Notes
  richTextNotes: true,
} as const;

// Theme list — all themes are free
export const ALL_THEMES = ["default", "midnight"] as const;

export type Theme = (typeof ALL_THEMES)[number];

// Helper — get the display limit for a feature. Returns the number or Infinity.
export function getLimit(
  feature: keyof typeof FREE_TIER_LIMITS,
  isPremium: boolean
): number {
  return isPremium
    ? PREMIUM_TIER_LIMITS[feature]
    : FREE_TIER_LIMITS[feature];
}

// Helper — check if a feature is premium-only
export function isPremiumFeature(
  feature: keyof typeof PREMIUM_FEATURES
): boolean {
  return PREMIUM_FEATURES[feature];
}
