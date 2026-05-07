import { pgTable, text, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { households } from "./households";

export const promo_codes = pgTable("promo_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: varchar("code", { length: 32 }).unique().notNull(),
  duration_days: integer("duration_days").notNull(),
  is_lifetime: boolean("is_lifetime").notNull().default(false),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  max_redemptions: integer("max_redemptions"),
  redemption_count: integer("redemption_count").notNull().default(0),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const promo_redemptions = pgTable("promo_redemptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  promo_code_id: text("promo_code_id")
    .notNull()
    .references(() => promo_codes.id),
  household_id: text("household_id")
    .notNull()
    .references(() => households.id),
  user_id: text("user_id").notNull(),
  redeemed_at: timestamp("redeemed_at").defaultNow(),
  premium_expires_at: timestamp("premium_expires_at"),
});

export type PromoCode = typeof promo_codes.$inferSelect;
export type NewPromoCode = typeof promo_codes.$inferInsert;
export type PromoRedemption = typeof promo_redemptions.$inferSelect;
export type NewPromoRedemption = typeof promo_redemptions.$inferInsert;
