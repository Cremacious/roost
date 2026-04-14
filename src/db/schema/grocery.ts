import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const grocery_lists = pgTable(
  "grocery_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    name: text("name").notNull().default("Shopping List"),
    is_default: boolean("is_default").notNull().default(false),
    created_by: text("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    householdCreatedIdx: index("grocery_lists_household_created_idx").on(
      t.household_id,
      t.created_at
    ),
  })
);

export const grocery_items = pgTable(
  "grocery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    list_id: uuid("list_id")
      .references(() => grocery_lists.id)
      .notNull(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    name: text("name").notNull(),
    quantity: text("quantity"),
    added_by: text("added_by").notNull(),
    checked: boolean("checked").notNull().default(false),
    checked_by: text("checked_by"),
    checked_at: timestamp("checked_at"),
    created_at: timestamp("created_at").defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    listCheckedIdx: index("grocery_items_list_checked_idx").on(
      t.list_id,
      t.checked
    ),
    householdCreatedIdx: index("grocery_items_household_created_idx").on(
      t.household_id,
      t.created_at
    ),
  })
);

export type GroceryList = typeof grocery_lists.$inferSelect;
export type NewGroceryList = typeof grocery_lists.$inferInsert;
export type GroceryItem = typeof grocery_items.$inferSelect;
export type NewGroceryItem = typeof grocery_items.$inferInsert;
