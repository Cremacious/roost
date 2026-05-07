import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { households } from './households'

// Tracks the 75 scans/month free tier cap per household
export const receiptScanUsage = pgTable('receipt_scan_usage', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), // YYYY-MM
  count: integer('count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
