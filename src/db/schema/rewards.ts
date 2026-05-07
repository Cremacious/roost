import { pgTable, text, timestamp, integer, boolean, numeric } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const rewardRules = pgTable('reward_rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  periodType: text('period_type').notNull().default('week').$type<'week' | 'month' | 'year' | 'custom'>(),
  periodDays: integer('period_days'),
  thresholdPercent: integer('threshold_percent').notNull().default(80),
  rewardType: text('reward_type').notNull().default('money').$type<'money' | 'gift' | 'activity' | 'other'>(),
  rewardDetail: text('reward_detail').notNull(),
  startsAt: timestamp('starts_at').notNull().defaultNow(),
  enabled: boolean('enabled').notNull().default(true),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const rewardPayouts = pgTable('reward_payouts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  ruleId: text('rule_id')
    .notNull()
    .references(() => rewardRules.id, { onDelete: 'cascade' }),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  earned: boolean('earned').notNull(),
  completionRate: integer('completion_rate').notNull(),
  rewardDetail: text('reward_detail').notNull(),
  expenseId: text('expense_id'),
  acknowledged: boolean('acknowledged').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
