import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  push_token: text("push_token"),
  avatar_color: text("avatar_color"),
  language: text("language").notNull().default("en"),
  theme: text("theme").notNull().default("default"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  temperature_unit: text("temperature_unit").notNull().default("fahrenheit"),
  chore_reminders_enabled: boolean("chore_reminders_enabled").notNull().default(false),
  // Child account fields
  is_child_account: boolean("is_child_account").notNull().default(false),
  child_of_household_id: text("child_of_household_id"),
  active_household_id: uuid("active_household_id").references(() => households.id),
  // Onboarding
  onboarding_completed: boolean("onboarding_completed").notNull().default(false),
  has_seen_welcome: boolean("has_seen_welcome").notNull().default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
