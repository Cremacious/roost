import { pgTable, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  avatarColor: text('avatar_color').default('#EF4444'),
  timezone: text('timezone').default('America/New_York'),
  language: text('language').default('en'),
  temperatureUnit: text('temperature_unit').default('fahrenheit'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  pushToken: text('push_token'),
  venmoHandle: text('venmo_handle'),
  cashappHandle: text('cashapp_handle'),
  activeHouseholdId: text('active_household_id'),
  isChildAccount: boolean('is_child_account').default(false),
  childOfHouseholdId: text('child_of_household_id'),
  hasSeenWelcome: boolean('has_seen_welcome').default(false),
  // JSON array (stored as text) of page-intro keys the user has dismissed.
  // Generalizes has_seen_welcome to per-page one-time intro popups.
  seenIntros: text('seen_intros').default('[]'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
