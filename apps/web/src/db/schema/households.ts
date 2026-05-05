import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const households = pgTable('households', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  adminId: text('admin_id').notNull(),
  subscriptionStatus: text('subscription_status')
    .notNull()
    .default('free')
    .$type<'free' | 'premium'>(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  premiumExpiresAt: timestamp('premium_expires_at'),
  revenuecatAppUserId: text('revenuecat_app_user_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
