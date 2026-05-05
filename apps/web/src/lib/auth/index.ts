import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: 'boolean',
        defaultValue: false,
        fieldName: 'onboarding_completed',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db
            .insert(schema.users)
            .values({
              id: user.id,
              name: user.name,
              email: user.email,
            })
            .onConflictDoNothing()
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
