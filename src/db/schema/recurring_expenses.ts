import { boolean, date, json, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const recurring_expense_templates = pgTable("recurring_expense_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  created_by: text("created_by").notNull(),
  title: text("title").notNull(),
  category: text("category"),
  notes: text("notes"),
  total_amount: numeric("total_amount").notNull(),
  // 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  frequency: text("frequency").notNull(),
  next_due_date: date("next_due_date").notNull(),
  last_posted_at: date("last_posted_at"),
  paused: boolean("paused").notNull().default(false),
  // Array of { userId: string; amount: number }
  splits: json("splits").$type<{ userId: string; amount: number }[]>().notNull().default([]),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type RecurringExpenseTemplate = typeof recurring_expense_templates.$inferSelect;
export type NewRecurringExpenseTemplate = typeof recurring_expense_templates.$inferInsert;
