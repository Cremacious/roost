import {
  boolean, date, integer, numeric, pgTable,
  text, timestamp, unique, uuid
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { expenses } from "./expenses";

export const reward_rules = pgTable(
  "reward_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id).notNull(),
    user_id: text("user_id").notNull(),
    title: text("title").notNull().default("Weekly reward"),
    reward_type: text("reward_type").notNull().default("money"),
    // "money" | "gift" | "activity" | "other"
    reward_description: text("reward_description"),
    // free text for gift/activity/other
    reward_amount: numeric("reward_amount"),
    // only used when reward_type = "money"
    period_type: text("period_type").notNull().default("week"),
    // "week" | "month" | "year" | "custom"
    period_days: integer("period_days"),
    // only used when period_type = "custom"
    threshold_percent: integer("threshold_percent").notNull().default(80),
    enabled: boolean("enabled").notNull().default(true),
    starts_at: date("starts_at"),
    created_by: text("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.user_id, t.title)]
);

export type RewardRule = typeof reward_rules.$inferSelect;
export type NewRewardRule = typeof reward_rules.$inferInsert;

export const reward_payouts = pgTable(
  "reward_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id).notNull(),
    user_id: text("user_id").notNull(),
    rule_id: uuid("rule_id").references(() => reward_rules.id),
    period_start: date("period_start").notNull(),
    period_end: date("period_end").notNull(),
    reward_type: text("reward_type").notNull(),
    reward_description: text("reward_description"),
    reward_amount: numeric("reward_amount"),
    earned: boolean("earned").notNull(),
    completion_rate: integer("completion_rate").notNull(),
    threshold_percent: integer("threshold_percent").notNull(),
    expense_id: uuid("expense_id").references(() => expenses.id),
    acknowledged: boolean("acknowledged").notNull().default(false),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.user_id, t.rule_id, t.period_start)]
);

export type RewardPayout = typeof reward_payouts.$inferSelect;
export type NewRewardPayout = typeof reward_payouts.$inferInsert;

// Keep old tables exported for migration safety --
// do not delete until migration is confirmed complete
export const allowance_settings = pgTable(
  "allowance_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id).notNull(),
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

export const allowance_payouts = pgTable(
  "allowance_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id).notNull(),
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
