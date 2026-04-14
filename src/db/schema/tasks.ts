import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    assigned_to: text("assigned_to"),
    due_date: timestamp("due_date"),
    priority: text("priority").notNull().default("medium"),
    completed: boolean("completed").notNull().default(false),
    completed_by: text("completed_by"),
    completed_at: timestamp("completed_at"),
    created_by: text("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    householdDueDateIdx: index("tasks_household_due_date_idx").on(
      t.household_id,
      t.due_date
    ),
    householdCompletedIdx: index("tasks_household_completed_idx").on(
      t.household_id,
      t.completed
    ),
  })
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
