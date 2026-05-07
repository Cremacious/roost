import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";

export const household_invites = pgTable("household_invites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  household_id: text("household_id")
    .references(() => households.id)
    .notNull(),
  created_by: text("created_by").notNull(),
  token: text("token").notNull().unique(),
  email: text("email"),
  is_guest: boolean("is_guest").notNull().default(false),
  expires_at: timestamp("expires_at").notNull(),
  link_expires_at: timestamp("link_expires_at").notNull(),
  accepted_at: timestamp("accepted_at"),
  accepted_by_user_id: text("accepted_by_user_id"),
  deleted_at: timestamp("deleted_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export type HouseholdInvite = typeof household_invites.$inferSelect;
export type NewHouseholdInvite = typeof household_invites.$inferInsert;
