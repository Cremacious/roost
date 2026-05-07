import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const notification_queue = pgTable(
  "notification_queue",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id").notNull(),
    type: text("type").notNull(),
    entity_id: text("entity_id"),
    entity_type: text("entity_type"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sent: boolean("sent").notNull().default(false),
    sent_at: timestamp("sent_at"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    sentAtIdx: index("notification_queue_sent_at_idx").on(t.sent, t.sent_at),
  })
);

export type NotificationQueueItem = typeof notification_queue.$inferSelect;
export type NewNotificationQueueItem = typeof notification_queue.$inferInsert;
