import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const requestRateLimits = pgTable(
  "request_rate_limits",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    count: integer("count").notNull().default(1),
    reset_at: timestamp("reset_at").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.scope, table.key] }),
    resetAtIdx: index("request_rate_limits_reset_at_idx").on(table.reset_at),
  })
);
