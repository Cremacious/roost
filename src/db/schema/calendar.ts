import { boolean, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";

export const calendar_events = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  household_id: uuid("household_id")
    .references(() => households.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time"),
  all_day: boolean("all_day").notNull().default(false),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
  // Recurrence fields (expand-on-fetch — no child rows, no cron)
  recurring: boolean("recurring").notNull().default(false),
  frequency: text("frequency"), // 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  repeat_end_type: text("repeat_end_type"), // 'forever' | 'until_date' | 'after_occurrences'
  repeat_until: timestamp("repeat_until"),
  repeat_occurrences: integer("repeat_occurrences"),
  // V2 fields
  category: text("category"),
  location: text("location"),
  notify_member_ids: text("notify_member_ids"),
  rsvp_enabled: boolean("rsvp_enabled").notNull().default(false),
});

export const event_attendees = pgTable(
  "event_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event_id: uuid("event_id")
      .references(() => calendar_events.id)
      .notNull(),
    user_id: text("user_id").notNull(),
    rsvp_status: text("rsvp_status"),
  },
  (t) => [unique().on(t.event_id, t.user_id)]
);

export type CalendarEvent = typeof calendar_events.$inferSelect;
export type NewCalendarEvent = typeof calendar_events.$inferInsert;
export type EventAttendee = typeof event_attendees.$inferSelect;
export type NewEventAttendee = typeof event_attendees.$inferInsert;
