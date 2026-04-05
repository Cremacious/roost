import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  title: text("title").notNull(),
  total_amount: numeric("total_amount").notNull(),
  paid_by: text("paid_by")
    .references(() => users.id)
    .notNull(),
  category: text("category"),
  receipt_url: text("receipt_url"),
  receipt_data: text("receipt_data"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const expense_splits = pgTable("expense_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  expense_id: uuid("expense_id")
    .references(() => expenses.id)
    .notNull(),
  user_id: text("user_id")
    .references(() => users.id)
    .notNull(),
  amount: numeric("amount").notNull(),
  settled: boolean("settled").notNull().default(false),
  settled_at: timestamp("settled_at"),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseSplit = typeof expense_splits.$inferSelect;
export type NewExpenseSplit = typeof expense_splits.$inferInsert;
