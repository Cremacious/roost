import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const householdActivity = pgTable('household_activity', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  type: text('type').notNull(),
  entityId: text('entity_id'),
  entityType: text('entity_type'),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
