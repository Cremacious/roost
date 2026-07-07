# Roost Deployment Runbook

An ordered, do-this-then-that guide for deploying Roost to production on Vercel,
wiring Stripe (test mode) and Azure Document Intelligence, and verifying the
result. Everything here is a manual dashboard step unless noted otherwise. The
code and config are already deploy-ready (see "What the code already does" at the
bottom).

Conventions: this app is Next.js 16 (App Router), Drizzle + Neon (PostgreSQL),
better-auth, Stripe, and Azure Document Intelligence.

> Boot behavior: `validateEnv()` runs at server startup (`src/instrumentation.ts`)
> and throws if any REQUIRED environment variable is missing or blank. If a
> required var is not set, the deployment boots into a crash loop and every
> request 500s. Set all required vars before your first real request.


## 0. Prerequisites

- A Neon project with a database (free tier is fine).
- A Vercel account.
- A Stripe account (you will use TEST mode).
- An Azure account (for receipt scanning; optional but covered here).
- Local tools to generate secrets: `openssl` (bundled with Git Bash on Windows).


## 1. Vercel: import the repo

1. Vercel dashboard > Add New > Project > Import Git Repository.
2. Select `Cremacious/roost`.
3. Framework Preset: Vercel auto-detects Next.js. Leave it as Next.js.
4. Build & Output settings (leave defaults, they are correct):
   - Build command: `next build` (from `package.json` `build` script).
   - Install command: `npm install`.
   - Output: Vercel handles the Next.js App Router output automatically.
5. Node.js version: set to 22.x (Project Settings > General > Node.js Version).
   The app is developed on Node 24 locally; 20.x or 22.x both work on Vercel.
   Do not pick 18.x.
6. Do NOT deploy yet. Add the environment variables first (next step), otherwise
   the first boot will crash on `validateEnv()`.


## 2. Environment variables

Set these in Vercel: Project > Settings > Environment Variables. Add each one to
BOTH the Production and Preview environments (Development is optional). A local
copy lives in `.env.example` at the repo root.

### Required (app will not boot without these)

| Variable | Example | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require` | Neon > Connection Details. Use the POOLED string (hostname contains `-pooler`). See section 3. |
| `BETTER_AUTH_SECRET` | 32+ char random string | Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` | Your deployed URL (no trailing slash). See note below. |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Same as `BETTER_AUTH_URL` in production. |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe > Developers > API keys (TEST mode). Section 4. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Created when you add the webhook endpoint. Section 4. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe > Developers > API keys (TEST mode). |
| `STRIPE_PRICE_ID` | `price_...` | The $4/month test price. Section 4. |
| `CRON_SECRET` | long random string | Generate: `openssl rand -hex 32`. Section 6. |

### Optional (the feature stays disabled until set)

| Variable | Example | Where to get it |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_...` | resend.com > API Keys. Missing = invite/reset emails skipped. |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | key string | Azure resource > Keys and Endpoint. Section 5. |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | `https://<res>.cognitiveservices.azure.com/` | Same place. Section 5. |
| `EXPO_ACCESS_TOKEN` | token | expo.dev > Access Tokens. Web never sends push, so leave unset for a web-only deploy. |
| `ADMIN_EMAIL` | `admin@you.com` | Your choice. Missing = `/admin` panel unusable. |
| `ADMIN_PASSWORD` | strong password | Your choice. |
| `ADMIN_JWT_SECRET` | random string | Optional. Falls back to `BETTER_AUTH_SECRET` if unset. |
| `GOOGLE_AUTH_CLIENT_ID` | `...apps.googleusercontent.com` | Google Cloud Console > Credentials. Both Google vars must be set to show the "Continue with Google" button; otherwise only email/password login is offered. |
| `GOOGLE_AUTH_CLIENT_SECRET` | secret | Google Cloud Console > Credentials. |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | Apple values | Apple Developer. All four required to enable Apple sign-in. |

Notes:
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` chicken-and-egg: on the very first
  deploy you may not know the URL yet. Deploy once with a placeholder (or your
  intended custom domain), read the assigned URL from Vercel, then update both
  vars to the real URL and redeploy. If you attach a custom domain, use that.
- `NEXT_PUBLIC_*` vars are inlined at BUILD time. If you change either public var
  you must trigger a new deployment (redeploy), not just save the var.
- Never commit real secrets. `.env.example` holds placeholders only.


## 3. Neon: use the pooled connection string

The app connects with `@neondatabase/serverless` over HTTP (`drizzle-orm/neon-http`),
which is the correct serverless driver. For serverless you must use Neon's
POOLED endpoint.

1. Neon dashboard > your project > Connection Details.
2. Toggle "Connection pooling" ON (or pick the "Pooled connection" tab).
3. Copy the string. The hostname must contain `-pooler`, for example
   `ep-cool-name-123456-pooler.us-east-2.aws.neon.tech`.
4. Paste it into `DATABASE_URL` in Vercel.

Schema: this project uses `drizzle-kit push` (no migration files). The schema
should already be pushed to your Neon database. If you are pointing at a fresh
database, run `npm run db:push` locally against that `DATABASE_URL` once before
going live.

TWO DATABASES: there is a dev database (the `DATABASE_URL` in `.env.local` locally)
and a separate PRODUCTION database (the `DATABASE_URL` set in Vercel). `db:push` only
touches whichever `DATABASE_URL` is currently set, which locally is the dev db. So EVERY
future schema change must be pushed to production too, not just dev:

```bash
DATABASE_URL="<production Neon url>" npm run db:push
```

Always read the data-loss preview before confirming, on both dev and prod (see RUNBOOK.md
section 3 for the ongoing-change procedure).


## 4. Stripe (TEST mode)

Do all of this with the Stripe dashboard toggled to Test mode (top-right).

1. API keys: Developers > API keys. Copy:
   - Secret key (`sk_test_...`) into `STRIPE_SECRET_KEY`.
   - Publishable key (`pk_test_...`) into `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. Product + price: Product catalog > Add product. Name it "Roost Premium",
   recurring, $4.00 / month. Save. Copy the Price ID (`price_...`) into
   `STRIPE_PRICE_ID`.
3. Webhook endpoint: Developers > Webhooks > Add endpoint.
   - Endpoint URL: `https://YOUR-DEPLOYED-URL/api/stripe/webhook`
   - Events to send (enable exactly these):
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Add endpoint, then reveal and copy the "Signing secret" (`whsec_...`) into
     `STRIPE_WEBHOOK_SECRET`.
4. Redeploy so the new/updated env vars take effect.

Test card (test mode only): `4242 4242 4242 4242`, any future expiry, any CVC,
any ZIP.

The webhook route (`/api/stripe/webhook`) verifies the Stripe signature and runs
on the Node.js runtime with the raw request body, so it works on Vercel as-is.
It has no session auth by design (Stripe signature is the auth).


## 5. Azure Document Intelligence (receipt scanning)

Optional. Receipt scanning is a premium-only feature; without these vars the
scan endpoint returns 503 and users fall back to manual entry.

1. Azure portal > Create a resource > "Document Intelligence" (formerly Form
   Recognizer).
2. Pricing tier: F0 (Free) gives 500 pages/month.
3. After it deploys, open the resource > Keys and Endpoint.
   - Copy KEY 1 into `AZURE_DOCUMENT_INTELLIGENCE_KEY`.
   - Copy Endpoint into `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
     (looks like `https://<name>.cognitiveservices.azure.com/`).
4. Redeploy.

The app uses the `prebuilt-receipt` model via `@azure/ai-form-recognizer`. The
scan route (`/api/expenses/scan`) is pinned to the Node.js runtime.


## 6. Cron jobs

`vercel.json` already declares all eight cron schedules. Vercel registers them
automatically from that file on deploy.

| Path | Schedule (UTC) |
| --- | --- |
| `/api/cron/reminders` | every 15 min |
| `/api/cron/rewards` | daily 23:00 |
| `/api/cron/subscription` | daily 00:00 |
| `/api/cron/settlement-reminders` | daily 10:00 |
| `/api/cron/recurring-expenses` | daily 08:00 |
| `/api/cron/budget-reset` | 1st of month 00:00 |
| `/api/cron/guest-expiry` | daily 02:00 |
| `/api/cron/activity-trim` | weekly, Sun 03:00 |

Security: every cron route requires `Authorization: Bearer <CRON_SECRET>` and
returns 401 otherwise. Vercel Cron automatically sends this header using the
`CRON_SECRET` you set in the project env, so:

1. Make sure `CRON_SECRET` is set in Vercel (Production).
2. After deploy, confirm the crons appear under Project > Settings > Cron Jobs.
3. Nobody can trigger them without the secret. To smoke-test manually you can
   call one with the header yourself:
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://YOUR-URL/api/cron/reminders`
   (a bare request with no header returns 401, which is the expected lockout).

Note: Vercel's Hobby plan limits cron frequency (the every-15-minutes reminder
cron may be down-sampled to run less often on Hobby). Upgrade to Pro if you need
the full schedule.


## 7. Deploy

1. With all required env vars set, trigger the deploy (push to `main`, or
   Deployments > Redeploy).
2. Watch the build logs. `next build` should complete. `validateEnv()` runs in
   `next.config.ts` during build in a non-fatal try/catch, so a missing var
   shows as a console error in the build log but does not fail the build. The
   hard check happens at runtime boot (`instrumentation.ts`).


## 8. Post-deploy verification checklist

- [ ] App boots: open the deployed URL. If required env is missing, requests
      500 and the runtime logs show the `validateEnv` error listing which vars.
- [ ] Auth works: sign up with email/password, then sign in. If Google/Apple
      vars are set, those buttons appear; otherwise only email/password shows.
- [ ] DB connects: creating an account and a household persists (relies on the
      pooled `DATABASE_URL`). Check for connection errors in Vercel runtime logs.
- [ ] Stripe end-to-end (test mode):
  1. As a household admin, start the upgrade / Checkout flow.
  2. Pay with `4242 4242 4242 4242`.
  3. Stripe fires `checkout.session.completed` to the webhook.
  4. Confirm `households.subscription_status` flips to `premium` (the app now
     shows premium features). In the Stripe dashboard, Developers > Webhooks >
     your endpoint shows a 200 for the event.
  5. Test cancel / reactivate / customer portal from the billing page.
- [ ] Receipt scan (if Azure configured): as a premium admin, scan a receipt via
      the money/expenses flow and confirm parsed line items return.
- [ ] Crons: Project > Settings > Cron Jobs lists all eight. A no-header request
      to any `/api/cron/*` returns 401.


## What the code already does (no action needed)

These were verified/added as part of making the repo deploy-ready:

- `validateEnv()` lists the correct required vars (including `STRIPE_PRICE_ID`)
  and runs at boot via `src/instrumentation.ts` (Node.js runtime only), so a
  missing required secret fails fast.
- `pdfkit` is in `serverExternalPackages` (next.config.ts). The PDF export route
  (`/api/expenses/export`) and the Azure scan route (`/api/expenses/scan`) both
  declare `export const runtime = 'nodejs'`. The Stripe webhook route also pins
  Node.js runtime and reads the raw body.
- Every `/api/cron/*` route verifies `CRON_SECRET` via the Authorization header.
- The DB client uses the Neon serverless HTTP driver, which is serverless-safe
  when pointed at the pooled `DATABASE_URL`.
- No hardcoded `localhost` / `:3000` in runtime code; redirects and links use
  `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`.
- `.env.example` documents every variable with placeholder values.
