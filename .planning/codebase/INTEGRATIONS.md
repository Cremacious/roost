# External Integrations

**Analysis Date:** 2026-05-01

## APIs & External Services

**Payments:**
- Stripe — subscription billing at $4/month per household
  - SDK: `stripe` npm package v22.0.0
  - Client singleton: `src/lib/utils/stripe.ts` (`getStripe()`)
  - API version: `2024-12-18.acacia`
  - Auth: `STRIPE_SECRET_KEY` (server), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client)
  - Webhook secret: `STRIPE_WEBHOOK_SECRET`
  - Price ID: `STRIPE_PRICE_ID`
  - Feature check: `isStripeConfigured()` in `src/lib/env.ts` — app works without Stripe, billing features disabled

**Receipt OCR:**
- Azure Document Intelligence — prebuilt-receipt model for scanning expense receipts
  - SDK: `@azure/ai-form-recognizer` v5.1.0 (`DocumentAnalysisClient`, `AzureKeyCredential`)
  - Util: `src/lib/utils/azureReceipts.ts` (`parseReceiptImage()`)
  - Auth: `AZURE_DOCUMENT_INTELLIGENCE_KEY` + `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
  - Free tier: 500 scans/month on F0 pricing tier
  - Feature check: `isAzureReceiptScanningConfigured()` in `src/lib/env.ts`

**Weather:**
- Open-Meteo — ambient weather widget on TopBar and tablet mode
  - No SDK, plain fetch to `https://api.open-meteo.com`
  - No API key required (free, unlimited)
  - CSP `connect-src` explicitly allows `https://api.open-meteo.com`
  - Fallback: Orlando, FL (28.5°N, -81.4°W) when no user location stored

**Push Notifications:**
- Expo Push Notifications — iOS/Android push for chore reminders (future Expo app)
  - Auth: `EXPO_ACCESS_TOKEN`
  - Push tokens stored in `users.push_token` column
  - Not yet active (iOS app not built); infrastructure in place

**Observability (optional):**
- Custom webhook-based observability — forwards structured events (page views, web vitals, client/server errors)
  - Client: `src/lib/observability/client.ts` — sends to `/api/observability/events` via `navigator.sendBeacon`
  - Server: `src/lib/observability/server.ts` — forwards to `OBSERVABILITY_WEBHOOK_URL` if configured
  - Events: `page_view`, `navigation_start`, `web_vital`, `client_error`, `server_error`
  - Feature check: `NEXT_PUBLIC_OBSERVABILITY_ENABLED` (defaults to `true` in production)
  - Designed to be swapped for Sentry/Axiom by updating `src/lib/utils/logger.ts` and `src/lib/observability/`

## Data Storage

**Primary Database:**
- Neon PostgreSQL (serverless)
  - Connection: `DATABASE_URL` environment variable
  - Driver: `@neondatabase/serverless` (HTTP-based, serverless-compatible)
  - ORM: Drizzle ORM via `drizzle-orm/neon-http`
  - Client: `src/lib/db/index.ts` — singleton `db` export
  - Free tier: 0.5GB storage
  - Schema: `src/db/schema/` split by domain; entry point `src/db/schema/index.ts`
  - No migration files; `npm run db:push` syncs schema to Neon

**File Storage:**
- None — no S3 or object storage
- Receipt images: converted to base64 client-side, sent as JSON body to `/api/expenses/scan`, not persisted
- Expense export PDFs: generated in-memory via `pdf-lib`, streamed as download response

**Caching:**
- TanStack Query client-side cache (staleTime: 10s on most queries, 60s on members)
- better-auth cookie cache: 5-minute max-age for session cookie (reduces DB calls in middleware)
- No Redis or server-side cache layer

## Authentication & Identity

**Primary Auth Provider:**
- better-auth v1.5.6
  - Server config: `src/lib/auth/index.ts`
  - Client: `src/lib/auth/client.ts` — `signIn`, `signUp`, `signOut`, `useSession`
  - Strategy: email + password (always enabled, min 8 chars)
  - Optional: Google OAuth (only active when `GOOGLE_AUTH_CLIENT_ID` + `GOOGLE_AUTH_CLIENT_SECRET` both set)
  - Session duration: 30 days
  - Password reset: via `sendPasswordResetEmail()` which calls Resend; URL delivered via email
  - Database adapter: `@better-auth/drizzle-adapter` with Drizzle + Neon
  - Tables: `user`, `session`, `account`, `verification` (in `src/db/schema/auth.ts`)
  - User mirror hook: on `user.create`, mirrors row to app `users` table (Drizzle insert with `onConflictDoNothing`)

**Child Accounts:**
- Custom PIN-based auth (not better-auth)
- Route: `GET /api/auth/child-login` (list children by household code) + `POST /api/auth/child-login` (verify PIN, create session)
- Child user rows: inserted into both better-auth `user` table AND app `users` table; placeholder email `child_${userId}@roost.internal`
- PIN hashed before storage using `hashPassword` from `better-auth/crypto`

**Admin Panel Auth:**
- Separate from user auth — custom jose JWT in HttpOnly cookie (8h, HS256)
- `src/lib/admin/auth.ts` — `createAdminSession`, `verifyAdminSession`, `checkAdminCredentials`
- Credentials: `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars
- JWT signing: `ADMIN_SESSION_SECRET`
- Optional IP allowlist: `ADMIN_ALLOWED_IPS` (comma-separated)

**Session Helpers:**
- `src/lib/auth/helpers.ts` — `requireSession`, `requireHouseholdMember`, `requireHouseholdAdmin`, `requirePremium`, `blockChild`
- `requirePremium()` checks `households.subscription_status` + `premium_expires_at`; lazy cleanup reverts expired premium

## Email

**Transactional Email:**
- Resend v6.10.0 — password reset emails only (no marketing, no notification emails)
  - Client: `src/lib/email/auth-emails.ts`
  - Auth: `RESEND_API_KEY`
  - From address: `AUTH_EMAIL_FROM` (e.g., `Roost <auth@code-mack.dev>`)
  - Free tier: 3,000 emails/month
  - Email sent: HTML + plain text password reset with 1-hour expiry link
  - Invite links: URL-based only (no email delivery for invites)

## Monitoring & Observability

**Structured Logging:**
- Custom logger: `src/lib/utils/logger.ts` — `log.info`, `log.warn`, `log.error`
- Format: `[event] key=value key=value` — human-readable + filterable in Vercel log explorer
- Rules: no PII logged (emails, names, receipt content); IDs and amounts are fine

**Error Tracking:**
- No third-party error tracker (Sentry not configured)
- Client errors captured by `ObservabilityProvider` (`src/components/providers/ObservabilityProvider.tsx`)
- Server errors reported via `reportRequestError()` in `src/lib/observability/server.ts`
- All events optionally forwarded to `OBSERVABILITY_WEBHOOK_URL`

**Web Vitals:**
- `WebVitals` component (`src/components/providers/WebVitals.tsx`) captures Core Web Vitals
- Forwarded via same observability pipeline

## CI/CD & Deployment

**Hosting:**
- Vercel (hobby tier, free)
- HTTPS + HSTS handled automatically by Vercel on custom domains
- No manual HSTS header needed in `next.config.ts`

**Scheduled Jobs (Vercel Cron):**
All defined in `vercel.json`. Secured with `CRON_SECRET` header check in each route.

| Schedule | Route | Purpose |
|----------|-------|---------|
| `*/15 * * * *` | `/api/cron/reminders` | Process due reminders, advance recurring |
| `0 23 * * *` | `/api/cron/rewards` | Evaluate reward rule completions, create payouts |
| `0 0 * * *` | `/api/cron/subscription` | Expire households past `premium_expires_at` |
| `0 10 * * *` | `/api/cron/settlement-reminders` | Notify payees of pending claims >7 days old |
| `0 8 * * *` | `/api/cron/recurring-expenses` | Create draft expenses for due templates |
| `0 0 1 * *` | `/api/cron/budget-reset` | Reset expense budgets on 1st of month |
| `0 2 * * *` | `/api/cron/guest-expiry` | Hard-delete expired guest household members |

**CI Pipeline:**
- Not detected (no `.github/workflows/` or CI config found)

## Webhooks & Callbacks

**Incoming Webhooks:**
- `POST /api/stripe/webhook` — Stripe billing events
  - No session auth; verified via `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
  - Events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
  - Raw body required: request read as `.text()`, not `.json()`
  - Updates `households.subscription_status`, `premium_expires_at`, `stripe_customer_id`

**Outgoing Webhooks:**
- Observability webhook: structured events POSTed to `OBSERVABILITY_WEBHOOK_URL` (optional, configurable)

## Content Security Policy

Configured in `src/lib/security/csp.ts`, applied globally in `next.config.ts`:
- `connect-src`: allows `https://api.stripe.com`, `https://js.stripe.com`, `https://checkout.stripe.com`, `https://billing.stripe.com`, `https://api.open-meteo.com`
- `frame-src`: allows Stripe Checkout and Billing iframes
- `form-action`: allows Stripe Checkout and Billing redirects
- `img-src`: self + data + blob (no CDN whitelist needed)

## Environment Configuration

**Required env vars (production will not start without these):**
```
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

**Required for admin panel:**
```
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

**Required for Stripe billing:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_ID
```

**Required for receipt scanning:**
```
AZURE_DOCUMENT_INTELLIGENCE_KEY
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
```

**Required for email (password reset):**
```
RESEND_API_KEY
AUTH_EMAIL_FROM
```

**Optional:**
```
OBSERVABILITY_WEBHOOK_URL       # Forward structured events to monitoring tool
NEXT_PUBLIC_OBSERVABILITY_ENABLED  # Defaults true in production
EXPO_ACCESS_TOKEN               # Push notifications (future Expo app)
GOOGLE_AUTH_CLIENT_ID           # Google OAuth (only if both Google vars set)
GOOGLE_AUTH_CLIENT_SECRET       # Google OAuth
ADMIN_ALLOWED_IPS               # Comma-separated IP allowlist for /admin
```

**Secrets location:**
- Development: `.env.local` (gitignored)
- Production: Vercel dashboard environment variables
- Reference template: `.env.example` (committed, no real values)

---

*Integration audit: 2026-05-01*
