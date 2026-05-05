import { pgTable, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  avatarColor: text('avatar_color').notNull().default('#EF4444'),
  theme: text('theme').notNull().default('default'),
  timezone: text('timezone').notNull().default('America/New_York'),
  language: text('language').notNull().default('en'),
  temperatureUnit: text('temperature_unit').notNull().default('fahrenheit'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  pushToken: text('push_token'),
  isChildAccount: boolean('is_child_account').notNull().default(false),
  childOfHouseholdId: text('child_of_household_id'),
  hasSeenWelcome: boolean('has_seen_welcome').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
