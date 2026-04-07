import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const notification_queue = pgTable("notification_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  type: text("type").notNull(),
  entity_id: uuid("entity_id"),
  entity_type: text("entity_type"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sent: boolean("sent").notNull().default(false),
  sent_at: timestamp("sent_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export type NotificationQueueItem = typeof notification_queue.$inferSelect;
export type NewNotificationQueueItem = typeof notification_queue.$inferInsert;
