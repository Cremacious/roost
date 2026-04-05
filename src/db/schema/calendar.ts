import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

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
  created_by: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const event_attendees = pgTable(
  "event_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event_id: uuid("event_id")
      .references(() => calendar_events.id)
      .notNull(),
    user_id: uuid("user_id")
      .references(() => users.id)
      .notNull(),
  },
  (t) => [unique().on(t.event_id, t.user_id)]
);

export type CalendarEvent = typeof calendar_events.$inferSelect;
export type NewCalendarEvent = typeof calendar_events.$inferInsert;
export type EventAttendee = typeof event_attendees.$inferSelect;
export type NewEventAttendee = typeof event_attendees.$inferInsert;
