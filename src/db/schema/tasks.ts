import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  color: text('color').notNull().default('#EC4899'),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  parentTaskId: text('parent_task_id'),
  title: text('title').notNull(),
  description: text('description'),
  assignedTo: text('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  dueTime: text('due_time'),
  priority: text('priority').notNull().default('medium').$type<'low' | 'medium' | 'high'>(),
  recurring: boolean('recurring').notNull().default(false),
  frequency: text('frequency'),
  repeatEndType: text('repeat_end_type'),
  repeatUntil: timestamp('repeat_until'),
  repeatOccurrences: integer('repeat_occurrences'),
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

export const taskComments = pgTable('task_comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const taskDelegations = pgTable('task_delegations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  fromUserId: text('from_user_id')
    .notNull()
    .references(() => users.id),
  toUserId: text('to_user_id')
    .notNull()
    .references(() => users.id),
  status: text('status').notNull().default('pending').$type<'pending' | 'accepted' | 'declined'>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
})
