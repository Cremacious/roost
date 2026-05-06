import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const choreCategories = pgTable('chore_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('Home'),
  color: text('color').notNull().default('#EF4444'),
  isDefault: text('is_default').notNull().default('false'),
  isCustom: text('is_custom').notNull().default('false'),
  suggestedBy: text('suggested_by').references(() => users.id),
  status: text('status').notNull().default('active').$type<'active' | 'pending' | 'rejected'>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const chores = pgTable('chores', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  assignedTo: text('assigned_to').references(() => users.id),
  categoryId: text('category_id').references(() => choreCategories.id),
  frequency: text('frequency').notNull().default('weekly').$type<
    'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
  >(),
  customDays: text('custom_days'),
  nextDueAt: timestamp('next_due_at'),
  lastCompletedAt: timestamp('last_completed_at'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  snoozedUntil: timestamp('snoozed_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const choreCompletions = pgTable('chore_completions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  choreId: text('chore_id')
    .notNull()
    .references(() => chores.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
  points: integer('points').notNull().default(10),
  weekStart: text('week_start').notNull(),
})
