import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const household_activity = pgTable("household_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  user_id: text("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(),
  entity_id: uuid("entity_id"),
  entity_type: text("entity_type"),
  description: text("description").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export type HouseholdActivity = typeof household_activity.$inferSelect;
export type NewHouseholdActivity = typeof household_activity.$inferInsert;
