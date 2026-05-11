/**
 * Environment variable validation.
 *
 * Call validateEnv() at server startup (next.config.ts) to fail fast when a
 * required secret is missing, rather than discovering it at request time via a
 * cryptic runtime error deep inside a library.
 *
 * Rules:
 * - REQUIRED vars crash the process immediately if absent.
 * - OPTIONAL vars emit a console.warn so they are visible in deploy logs but
 *   do not block startup (the feature they power is simply unavailable).
 *
 * Keep this file in sync with CLAUDE.md ## Environment Variables.
 */

interface EnvSpec {
  /** Variable name */
  name: string
  /** If true, missing value throws. If false, missing value warns. */
  required: boolean
  /** Human-readable description shown in the error/warning. */
  description: string
}

const ENV_SPEC: EnvSpec[] = [
  // ── Database ────────────────────────────────────────────────────────────────
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'Neon PostgreSQL connection string',
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  {
    name: 'BETTER_AUTH_SECRET',
    required: true,
    description: 'Secret key for better-auth session signing (min 32 chars)',
  },
  {
    name: 'BETTER_AUTH_URL',
    required: true,
    description: 'Canonical base URL used by better-auth (e.g. https://roost.app)',
  },

  // ── App ─────────────────────────────────────────────────────────────────────
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    description: 'Public base URL for invite links and redirects',
  },

  // ── Stripe ──────────────────────────────────────────────────────────────────
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    description: 'Stripe secret key for Checkout and subscription management',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    description: 'Stripe webhook signing secret (from dashboard → webhooks)',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: true,
    description: 'Stripe publishable key (safe to expose client-side)',
  },

  // ── Cron ────────────────────────────────────────────────────────────────────
  {
    name: 'CRON_SECRET',
    required: true,
    description: 'Shared secret that Vercel cron jobs send in the Authorization header',
  },

  // ── Admin panel ─────────────────────────────────────────────────────────────
  {
    name: 'ADMIN_EMAIL',
    required: false,
    description: 'Email for the /admin panel login. Missing = admin panel disabled.',
  },
  {
    name: 'ADMIN_PASSWORD',
    required: false,
    description: 'Password for the /admin panel login. Missing = admin panel disabled.',
  },

  // ── Optional integrations ────────────────────────────────────────────────────
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for transactional email (invite links). Missing = emails disabled.',
  },
  {
    name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY',
    required: false,
    description: 'Azure Document Intelligence key for receipt OCR. Missing = scanning disabled.',
  },
  {
    name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT',
    required: false,
    description: 'Azure Document Intelligence endpoint URL. Missing = scanning disabled.',
  },
  {
    name: 'EXPO_ACCESS_TOKEN',
    required: false,
    description: 'Expo push notification token. Missing = push notifications disabled.',
  },
]

/**
 * Validate all environment variables defined in ENV_SPEC.
 *
 * - Throws an Error listing ALL missing required vars (not just the first one).
 * - Warns to console for each missing optional var.
 *
 * Call this once at startup, not at import time, so it does not interfere with
 * Edge Runtime module evaluation (which happens before env vars are injected).
 */
export function validateEnv(): void {
  const missing: string[] = []

  for (const spec of ENV_SPEC) {
    const value = process.env[spec.name]
    const isEmpty = value === undefined || value.trim() === ''

    if (isEmpty) {
      if (spec.required) {
        missing.push(`  • ${spec.name}: ${spec.description}`)
      } else {
        // Warn but do not block startup
        console.warn(
          `[env] Optional var ${spec.name} is not set — ${spec.description}`
        )
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      [
        '[env] Missing required environment variables. Set them in .env.local (dev) or your Vercel project settings (prod).',
        ...missing,
      ].join('\n')
    )
  }
}
