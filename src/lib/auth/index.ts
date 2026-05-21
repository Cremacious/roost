import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import * as schema from '@/db/schema'

const resend = new Resend(process.env.RESEND_API_KEY)

// Apple is only registered when all four env vars are present.
// Add APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY to .env.local to enable.
const appleProvider =
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          teamId: process.env.APPLE_TEAM_ID,
          keyId: process.env.APPLE_KEY_ID,
          privateKey: process.env.APPLE_PRIVATE_KEY,
        },
      }
    : {}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL!,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_AUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET!,
    },
    ...appleProvider,
  },
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
    sendResetPassword: async ({ user, url }) => {
      if (!process.env.RESEND_API_KEY) {
        console.warn('[auth] RESEND_API_KEY not set — password reset email skipped')
        return
      }
      await resend.emails.send({
        from: 'Roost <noreply@code-mack.dev>',
        to: user.email,
        subject: 'Reset your Roost password',
        html: `
          <div style="font-family: Nunito, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h1 style="color: #1A0505; font-size: 24px; font-weight: 900; margin: 0 0 8px;">Reset your password</h1>
            <p style="color: #7A3F3F; font-size: 15px; font-weight: 600; margin: 0 0 28px; line-height: 1.5;">
              Someone requested a password reset for your Roost account. If that was you, click the button below.
            </p>
            <a href="${url}" style="display: inline-block; padding: 14px 28px; background: #EF4444; border-radius: 14px; color: #fff; font-weight: 800; font-size: 15px; text-decoration: none;">
              Reset password
            </a>
            <p style="color: #9B9590; font-size: 13px; font-weight: 600; margin: 24px 0 0; line-height: 1.5;">
              This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.
            </p>
          </div>
        `,
      })
    },
  },
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: 'boolean',
        defaultValue: false,
        fieldName: 'onboardingCompleted',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await db
              .insert(schema.users)
              .values({
                id: user.id,
                name: user.name,
                email: user.email,
              })
              .onConflictDoNothing()
          } catch (err) {
            console.error('[auth] databaseHook: failed to create users row for', user.id, err)
          }
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
