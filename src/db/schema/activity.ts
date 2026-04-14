import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const household_activity = pgTable(
  "household_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    user_id: text("user_id").notNull(),
    type: text("type").notNull(),
    entity_id: uuid("entity_id"),
    entity_type: text("entity_type"),
    description: text("description").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    householdCreatedIdx: index("household_activity_household_created_idx").on(
      t.household_id,
      t.created_at
    ),
  })
);

export type HouseholdActivity = typeof household_activity.$inferSelect;
export type NewHouseholdActivity = typeof household_activity.$inferInsert;
