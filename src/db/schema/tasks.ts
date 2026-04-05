import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assigned_to: uuid("assigned_to").references(() => users.id),
  due_date: timestamp("due_date"),
  priority: text("priority").notNull().default("medium"),
  completed: boolean("completed").notNull().default(false),
  completed_by: uuid("completed_by").references(() => users.id),
  completed_at: timestamp("completed_at"),
  created_by: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
