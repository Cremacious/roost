import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const grocery_lists = pgTable("grocery_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  name: text("name").notNull().default("Shopping List"),
  is_default: boolean("is_default").notNull().default(false),
  created_by: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const grocery_items = pgTable("grocery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  list_id: uuid("list_id")
    .references(() => grocery_lists.id)
    .notNull(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  added_by: uuid("added_by")
    .references(() => users.id)
    .notNull(),
  checked: boolean("checked").notNull().default(false),
  checked_by: uuid("checked_by").references(() => users.id),
  checked_at: timestamp("checked_at"),
  created_at: timestamp("created_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type GroceryList = typeof grocery_lists.$inferSelect;
export type NewGroceryList = typeof grocery_lists.$inferInsert;
export type GroceryItem = typeof grocery_items.$inferSelect;
export type NewGroceryItem = typeof grocery_items.$inferInsert;
