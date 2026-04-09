import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const household_members = pgTable(
  "household_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    user_id: text("user_id").notNull(),
    role: text("role").notNull().default("member"),
    pin: text("pin"),
    expires_at: timestamp("expires_at"),
    joined_at: timestamp("joined_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.user_id)]
);

export const member_permissions = pgTable(
  "member_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    user_id: text("user_id").notNull(),
    permission: text("permission").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [unique().on(t.household_id, t.user_id, t.permission)]
);

export type HouseholdMember = typeof household_members.$inferSelect;
export type NewHouseholdMember = typeof household_members.$inferInsert;
export type MemberPermission = typeof member_permissions.$inferSelect;
export type NewMemberPermission = typeof member_permissions.$inferInsert;
