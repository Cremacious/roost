import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const groceryLists = pgTable('grocery_lists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const groceryItems = pgTable('grocery_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  listId: text('list_id')
    .notNull()
    .references(() => groceryLists.id, { onDelete: 'cascade' }),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: text('quantity'),
  isChecked: boolean('is_checked').notNull().default(false),
  checkedBy: text('checked_by').references(() => users.id),
  checkedAt: timestamp('checked_at'),
  addedBy: text('added_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
