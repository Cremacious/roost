import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const household_join_requests = pgTable(
  "household_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    requester_user_id: text("requester_user_id").notNull(),
    status: text("status").notNull().default("pending"),
    resolved_by_user_id: text("resolved_by_user_id"),
    resolved_at: timestamp("resolved_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    householdStatusIdx: index("household_join_requests_household_status_idx").on(
      t.household_id,
      t.status,
      t.created_at,
    ),
    requesterStatusIdx: index("household_join_requests_requester_status_idx").on(
      t.requester_user_id,
      t.status,
      t.created_at,
    ),
  }),
);

export type HouseholdJoinRequest = typeof household_join_requests.$inferSelect;
export type NewHouseholdJoinRequest = typeof household_join_requests.$inferInsert;
