import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const referrals = pgTable('referrals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: text('referrer_id')
    .notNull()
    .references(() => users.id),
  referredUserId: text('referred_user_id')
    .notNull()
    .references(() => users.id),
  referralCode: text('referral_code').notNull(),
  referredAt: timestamp('referred_at').notNull().defaultNow(),
  qualifiedAt: timestamp('qualified_at'),
  rewardAppliedAt: timestamp('reward_applied_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
