import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const promoCodes = pgTable('promo_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  durationDays: integer('duration_days').notNull().default(30),
  isLifetime: boolean('is_lifetime').notNull().default(false),
  status: text('status').notNull().default('active').$type<'active' | 'paused' | 'deactivated'>(),
  maxRedemptions: integer('max_redemptions'),
  redemptionCount: integer('redemption_count').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const promoRedemptions = pgTable('promo_redemptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  promoCodeId: text('promo_code_id')
    .notNull()
    .references(() => promoCodes.id),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  redeemedAt: timestamp('redeemed_at').notNull().defaultNow(),
  premiumExpiresAt: timestamp('premium_expires_at'),
})
