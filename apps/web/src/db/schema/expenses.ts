import { pgTable, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const expenseCategories = pgTable('expense_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('DollarSign'),
  color: text('color').notNull().default('#22C55E'),
  isDefault: boolean('is_default').notNull().default(false),
  isCustom: boolean('is_custom').notNull().default(false),
  suggestedBy: text('suggested_by').references(() => users.id),
  status: text('status').notNull().default('active').$type<'active' | 'pending' | 'rejected'>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  categoryId: text('category_id').references(() => expenseCategories.id),
  paidBy: text('paid_by')
    .notNull()
    .references(() => users.id),
  notes: text('notes'),
  receiptData: text('receipt_data'),
  isRecurringDraft: boolean('is_recurring_draft').notNull().default(false),
  recurringTemplateId: text('recurring_template_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const expenseSplits = pgTable('expense_splits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  expenseId: text('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  settled: boolean('settled').notNull().default(false),
  settledByPayer: boolean('settled_by_payer').notNull().default(false),
  settledByPayee: boolean('settled_by_payee').notNull().default(false),
  settlementDisputed: boolean('settlement_disputed').notNull().default(false),
  settlementLastRemindedAt: timestamp('settlement_last_reminded_at'),
  settledAt: timestamp('settled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const recurringExpenses = pgTable('recurring_expenses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  categoryId: text('category_id').references(() => expenseCategories.id),
  notes: text('notes'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  frequency: text('frequency').notNull().$type<'weekly' | 'biweekly' | 'monthly' | 'yearly'>(),
  nextDueDate: timestamp('next_due_date').notNull(),
  lastPostedAt: timestamp('last_posted_at'),
  paused: boolean('paused').notNull().default(false),
  splits: text('splits').notNull().default('[]'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
