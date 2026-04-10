import { boolean, date, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { expenses } from "./expenses";

export const allowance_settings = pgTable(
  "allowance_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    user_id: text("user_id").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    weekly_amount: numeric("weekly_amount").notNull().default("0"),
    threshold_percent: integer("threshold_percent").notNull().default(80),
    evaluation_day: text("evaluation_day").notNull().default("sunday"),
    created_by: text("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.user_id)]
);

export type AllowanceSetting = typeof allowance_settings.$inferSelect;
export type NewAllowanceSetting = typeof allowance_settings.$inferInsert;

export const allowance_payouts = pgTable(
  "allowance_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    user_id: text("user_id").notNull(),
    week_start: date("week_start").notNull(),
    amount: numeric("amount").notNull(),
    earned: boolean("earned").notNull(),
    completion_rate: integer("completion_rate").notNull(),
    threshold_percent: integer("threshold_percent").notNull(),
    expense_id: uuid("expense_id").references(() => expenses.id),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.user_id, t.week_start)]
);

export type AllowancePayout = typeof allowance_payouts.$inferSelect;
export type NewAllowancePayout = typeof allowance_payouts.$inferInsert;
