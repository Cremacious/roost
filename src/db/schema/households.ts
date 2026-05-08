import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  code: text("invite_code").unique().notNull(),
  subscription_status: text("subscription_status").notNull().default("free"),
  stripe_subscription_id: text("stripe_subscription_id"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_price_id: text("stripe_price_id"),
  premium_expires_at: timestamp("premium_expires_at"),
  subscription_upgraded_at: timestamp("subscription_upgraded_at"),
  stats_visibility: text("stats_visibility"), // JSON: { leaderboard, chores, expenses, tasks, meals, grocery }
  meal_approval_mode: text("meal_approval_mode").notNull().default("admin_only").$type<'admin_only' | 'open_vote'>(),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
