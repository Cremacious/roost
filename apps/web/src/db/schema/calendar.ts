import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  allDay: boolean('all_day').notNull().default(false),
  recurring: boolean('recurring').notNull().default(false),
  frequency: text('frequency').$type<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>(),
  repeatEndType: text('repeat_end_type').$type<'forever' | 'until_date' | 'after_occurrences'>(),
  repeatUntil: timestamp('repeat_until'),
  repeatOccurrences: integer('repeat_occurrences'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const eventAttendees = pgTable('event_attendees', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text('event_id')
    .notNull()
    .references(() => calendarEvents.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
