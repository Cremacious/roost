import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  push_token: text("push_token"),
  avatar_color: text("avatar_color"),
  language: text("language").notNull().default("en"),
  theme: text("theme").notNull().default("warm"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
