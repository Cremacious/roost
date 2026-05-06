import { pgTable, text, timestamp, numeric, date } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const savingsGoals = pgTable('savings_goals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetAmount: numeric('target_amount', { precision: 10, scale: 2 }).notNull(),
  targetDate: date('target_date'),
  description: text('description'),
  completedAt: timestamp('completed_at'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const goalContributions = pgTable('goal_contributions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  goalId: text('goal_id')
    .notNull()
    .references(() => savingsGoals.id, { onDelete: 'cascade' }),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
