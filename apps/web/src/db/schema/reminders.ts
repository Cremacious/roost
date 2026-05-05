import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const reminders = pgTable('reminders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  note: text('note'),
  remindAt: timestamp('remind_at').notNull(),
  nextRemindAt: timestamp('next_remind_at').notNull(),
  frequency: text('frequency').$type<'once' | 'daily' | 'weekly' | 'monthly' | 'custom'>(),
  customDays: text('custom_days'),
  notifyType: text('notify_type').notNull().default('self').$type<'self' | 'specific' | 'household'>(),
  notifyUserIds: text('notify_user_ids').notNull().default('[]'),
  completed: boolean('completed').notNull().default(false),
  snoozedUntil: timestamp('snoozed_until'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const reminderReceipts = pgTable('reminder_receipts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reminderId: text('reminder_id')
    .notNull()
    .references(() => reminders.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  seen: boolean('seen').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
