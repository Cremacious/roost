import { pgTable, text, timestamp, numeric, integer } from 'drizzle-orm/pg-core'
import { households } from './households'
import { expenseCategories } from './expenses'

export const expenseBudgets = pgTable('expense_budgets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => expenseCategories.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  warningThreshold: integer('warning_threshold').notNull().default(70),
  periodStart: timestamp('period_start').notNull().defaultNow(),
  lastResetAt: timestamp('last_reset_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
