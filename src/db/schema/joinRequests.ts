import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const joinRequests = pgTable(
  "join_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    householdId: text("household_id").notNull(),
    userId: text("user_id").notNull(),
    type: text("type").notNull().$type<"code" | "invite">(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("join_requests_household_user_uidx").on(t.householdId, t.userId)]
);

export type JoinRequest = typeof joinRequests.$inferSelect;
