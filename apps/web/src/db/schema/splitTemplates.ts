import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const splitTemplates = pgTable('split_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  method: text('method').notNull(),
  splits: text('splits').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type SplitTemplate = typeof splitTemplates.$inferSelect
export type NewSplitTemplate = typeof splitTemplates.$inferInsert
