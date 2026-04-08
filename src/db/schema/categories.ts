import { boolean, date, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const expense_categories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  is_default: boolean("is_default").default(false),
  is_custom: boolean("is_custom").default(false),
  suggested_by: text("suggested_by"), // FK to auth user.id (text)
  status: text("status").default("active"), // 'active' | 'pending' | 'rejected'
  created_at: timestamp("created_at").defaultNow(),
});

export const expense_budgets = pgTable(
  "expense_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    category_id: uuid("category_id")
      .references(() => expense_categories.id)
      .notNull(),
    amount: numeric("amount").notNull(),
    reset_type: text("reset_type").default("monthly"), // 'monthly' | 'manual'
    warning_threshold: integer("warning_threshold").default(80), // 50-95
    period_start: date("period_start").notNull(),
    last_reset_at: timestamp("last_reset_at"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("expense_budgets_household_category_unique").on(
      t.household_id,
      t.category_id
    ),
  })
);

export type ExpenseCategory = typeof expense_categories.$inferSelect;
export type NewExpenseCategory = typeof expense_categories.$inferInsert;
export type ExpenseBudget = typeof expense_budgets.$inferSelect;
export type NewExpenseBudget = typeof expense_budgets.$inferInsert;
