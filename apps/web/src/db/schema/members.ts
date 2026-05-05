import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const householdMembers = pgTable('household_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member').$type<'admin' | 'member' | 'guest' | 'child'>(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const memberPermissions = pgTable('member_permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expensesView: boolean('expenses_view').notNull().default(true),
  expensesAdd: boolean('expenses_add').notNull().default(true),
  choresAdd: boolean('chores_add').notNull().default(false),
  choresEdit: boolean('chores_edit').notNull().default(false),
  groceryAdd: boolean('grocery_add').notNull().default(true),
  groceryCreateList: boolean('grocery_create_list').notNull().default(false),
  calendarAdd: boolean('calendar_add').notNull().default(true),
  calendarEdit: boolean('calendar_edit').notNull().default(false),
  tasksAdd: boolean('tasks_add').notNull().default(true),
  notesAdd: boolean('notes_add').notNull().default(true),
  mealsPlan: boolean('meals_plan').notNull().default(true),
  mealsSuggest: boolean('meals_suggest').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
