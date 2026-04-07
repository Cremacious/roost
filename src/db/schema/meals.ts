import { date, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const meals = pgTable("meals", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("dinner"),
  ingredients: text("ingredients"), // JSON array of strings
  prep_time: integer("prep_time"),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const meal_plan_slots = pgTable(
  "meal_plan_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    meal_id: uuid("meal_id").references(() => meals.id),
    custom_meal_name: text("custom_meal_name"),
    slot_date: date("slot_date").notNull(),
    slot_type: text("slot_type").notNull(),
    assigned_by: text("assigned_by").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.slot_date, t.slot_type)]
);

export const meal_suggestions = pgTable("meal_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  suggested_by: text("suggested_by").notNull(),
  meal_name: text("meal_name").notNull(),
  note: text("note"),
  category: text("category").notNull().default("dinner"),
  prep_time: integer("prep_time"),
  ingredients: text("ingredients"), // JSON array of strings
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

export const meal_suggestion_votes = pgTable(
  "meal_suggestion_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    suggestion_id: uuid("suggestion_id")
      .references(() => meal_suggestions.id)
      .notNull(),
    user_id: text("user_id").notNull(),
    vote: text("vote").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.suggestion_id, t.user_id)]
);

export type Meal = typeof meals.$inferSelect;
export type MealPlanSlot = typeof meal_plan_slots.$inferSelect;
export type MealSuggestion = typeof meal_suggestions.$inferSelect;
export type MealSuggestionVote = typeof meal_suggestion_votes.$inferSelect;
