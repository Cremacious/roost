import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  title: text("title").notNull(),
  total_amount: numeric("total_amount").notNull(),
  paid_by: text("paid_by").notNull(),
  category: text("category"),
  receipt_url: text("receipt_url"),
  receipt_data: text("receipt_data"),
  // Recurring support
  recurring_template_id: text("recurring_template_id"),
  is_recurring_draft: boolean("is_recurring_draft").notNull().default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const expense_splits = pgTable("expense_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  expense_id: uuid("expense_id")
    .references(() => expenses.id)
    .notNull(),
  user_id: text("user_id").notNull(),
  amount: numeric("amount").notNull(),
  settled: boolean("settled").notNull().default(false),
  settled_at: timestamp("settled_at"),
  // Two-sided settlement columns
  settled_by_payer: boolean("settled_by_payer").notNull().default(false),
  settled_by_payee: boolean("settled_by_payee").notNull().default(false),
  settlement_claimed_at: timestamp("settlement_claimed_at"),
  settlement_last_reminded_at: timestamp("settlement_last_reminded_at"),
  settlement_disputed: boolean("settlement_disputed").notNull().default(false),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseSplit = typeof expense_splits.$inferSelect;
export type NewExpenseSplit = typeof expense_splits.$inferInsert;
