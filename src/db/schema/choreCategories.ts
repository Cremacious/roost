import {
  boolean,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { households } from "./households";

export const chore_categories = pgTable("chore_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  household_id: text("household_id")
    .references(() => households.id)
    .notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("CheckSquare"),
  color: text("color").notNull().default("#EF4444"),
  is_default: boolean("is_default").notNull().default(false),
  is_custom: boolean("is_custom").notNull().default(true),
  suggested_by: text("suggested_by"),
  status: text("status").notNull().default("active"),
  // 'active' | 'pending' | 'rejected'
  created_at: timestamp("created_at").defaultNow(),
});

export type ChoreCategory = typeof chore_categories.$inferSelect;
export type NewChoreCategory = typeof chore_categories.$inferInsert;
