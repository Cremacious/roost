import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  created_by: text("created_by")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  note: text("note"),
  remind_at: timestamp("remind_at").notNull(),
  frequency: text("frequency").notNull().default("once"),
  custom_days: text("custom_days"), // JSON array of day numbers (0=Sun..6=Sat)
  notify_type: text("notify_type").notNull().default("self"), // self | specific | household
  notify_user_ids: text("notify_user_ids"), // JSON array of user ids for 'specific'
  completed: boolean("completed").notNull().default(false),
  completed_at: timestamp("completed_at"),
  completed_by: text("completed_by").references(() => users.id),
  last_sent_at: timestamp("last_sent_at"),
  next_remind_at: timestamp("next_remind_at"),
  snoozed_until: timestamp("snoozed_until"), // set on recurring complete, cleared on undo
  deleted_at: timestamp("deleted_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const reminder_receipts = pgTable(
  "reminder_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminder_id: uuid("reminder_id")
      .references(() => reminders.id)
      .notNull(),
    user_id: text("user_id")
      .references(() => users.id)
      .notNull(),
    seen: boolean("seen").notNull().default(false),
    seen_at: timestamp("seen_at"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.reminder_id, t.user_id)]
);

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type ReminderReceipt = typeof reminder_receipts.$inferSelect;
