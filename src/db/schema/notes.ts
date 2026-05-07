import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";

export const notes = pgTable("notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  household_id: text("household_id")
    .references(() => households.id)
    .notNull(),
  title: text("title"),
  content: text("content").notNull(),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
