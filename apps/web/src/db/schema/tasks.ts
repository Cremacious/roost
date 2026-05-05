import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  assignedTo: text('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  priority: text('priority').notNull().default('medium').$type<'low' | 'medium' | 'high'>(),
  completed: boolean('completed').notNull().default(false),
  completedBy: text('completed_by').references(() => users.id),
  completedAt: timestamp('completed_at'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
