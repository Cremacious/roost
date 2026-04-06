import { boolean, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const allowance_settings = pgTable(
  "allowance_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    user_id: text("user_id")
      .references(() => users.id)
      .notNull(),
    enabled: boolean("enabled").notNull().default(false),
    weekly_amount: numeric("weekly_amount").notNull().default("0"),
    threshold_percent: integer("threshold_percent").notNull().default(80),
    created_by: text("created_by")
      .references(() => users.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.user_id)]
);

export type AllowanceSetting = typeof allowance_settings.$inferSelect;
export type NewAllowanceSetting = typeof allowance_settings.$inferInsert;
