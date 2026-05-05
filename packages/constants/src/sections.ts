import { SECTION_COLORS, SECTION_DARK_COLORS } from './colors'

export const NAV_TABS = ['today', 'household', 'food', 'money', 'more'] as const
export type NavTab = (typeof NAV_TABS)[number]

export const CHORE_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'custom',
] as const
export type ChoreFrequency = (typeof CHORE_FREQUENCIES)[number]

export const MEAL_CATEGORIES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
] as const
export type MealCategory = (typeof MEAL_CATEGORIES)[number]

export const EXPENSE_SPLIT_METHODS = ['equal', 'custom', 'payer_only'] as const
export type ExpenseSplitMethod = (typeof EXPENSE_SPLIT_METHODS)[number]

export const MEMBER_ROLES = ['admin', 'member', 'guest', 'child'] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const SUBSCRIPTION_STATUSES = ['free', 'premium'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const REWARD_TYPES = ['money', 'gift', 'activity', 'other'] as const
export type RewardType = (typeof REWARD_TYPES)[number]

export const PERIOD_TYPES = ['week', 'month', 'year', 'custom'] as const
export type PeriodType = (typeof PERIOD_TYPES)[number]

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export { SECTION_COLORS, SECTION_DARK_COLORS }
