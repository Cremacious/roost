import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { log } from "@/lib/utils/logger";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      onboarding_completed: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
        fieldName: "onboarding_completed",
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await db.insert(users).values({
              id: user.id,
              email: user.email ?? undefined,
              name: user.name,
              timezone: "America/New_York",
              language: "en",
            }).onConflictDoNothing();
          } catch (err) {
            log.error("auth.user_mirror.failed", undefined, err);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
