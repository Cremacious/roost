import { date, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const chores = pgTable("chores", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assigned_to: uuid("assigned_to").references(() => users.id),
  frequency: text("frequency").notNull(),
  custom_days: text("custom_days"),
  last_completed_at: timestamp("last_completed_at"),
  next_due_at: timestamp("next_due_at"),
  created_by: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const chore_completions = pgTable("chore_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  chore_id: uuid("chore_id")
    .references(() => chores.id)
    .notNull(),
  completed_by: uuid("completed_by")
    .references(() => users.id)
    .notNull(),
  completed_at: timestamp("completed_at").defaultNow(),
  photo_url: text("photo_url"),
});

export const chore_streaks = pgTable(
  "chore_streaks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    household_id: uuid("household_id")
      .references(() => households.id)
      .notNull(),
    user_id: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    current_streak: integer("current_streak").notNull().default(0),
    longest_streak: integer("longest_streak").notNull().default(0),
    points: integer("points").notNull().default(0),
    week_start: date("week_start").notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.household_id, t.user_id, t.week_start)]
);

export type Chore = typeof chores.$inferSelect;
export type NewChore = typeof chores.$inferInsert;
export type ChoreCompletion = typeof chore_completions.$inferSelect;
export type NewChoreCompletion = typeof chore_completions.$inferInsert;
export type ChoreStreak = typeof chore_streaks.$inferSelect;
export type NewChoreStreak = typeof chore_streaks.$inferInsert;
