import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const householdInvites = pgTable('household_invites', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  email: text('email'),
  isGuest: text('is_guest').notNull().default('false'),
  expiresAt: timestamp('expires_at'),
  linkExpiresAt: timestamp('link_expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  acceptedByUserId: text('accepted_by_user_id').references(() => users.id),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
