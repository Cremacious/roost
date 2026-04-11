# Roost — Production Runbook

Operational reference for deploying, verifying, and recovering Roost in production.

Optimized for: a second person performing the deploy with no prior context.

---

## Table of contents

1. [First deploy checklist](#1-first-deploy-checklist)
2. [Environment variables in Vercel](#2-environment-variables-in-vercel)
3. [Database setup and migration](#3-database-setup-and-migration)
4. [Stripe setup](#4-stripe-setup)
5. [Cron job setup and verification](#5-cron-job-setup-and-verification)
6. [Post-deploy smoke test](#6-post-deploy-smoke-test)
7. [Routine deploys](#7-routine-deploys)
8. [Rollback procedure](#8-rollback-procedure)
9. [Incident checklist](#9-incident-checklist)

---

## 1. First deploy checklist

Work through these in order. Each section has detail below.

```
[ ] Neon database created and DATABASE_URL copied
[ ] All required env vars set in Vercel (Section 2)
[ ] Schema pushed to production database (Section 3)
[ ] Vercel project connected to git repo and first deploy complete
[ ] NEXT_PUBLIC_APP_URL set to the real production domain (not localhost)
[ ] Stripe product and price created, STRIPE_PRICE_ID confirmed (Section 4)
[ ] Stripe webhook registered with production URL (Section 4)
[ ] Stripe Customer Portal activated in Stripe dashboard (Section 4)
[ ] Cron jobs visible in Vercel dashboard (Section 5)
[ ] Smoke test passed (Section 6)
[ ] Admin panel login verified at /admin
```

---

## 2. Environment variables in Vercel

Set these in: **Vercel Dashboard > your project > Settings > Environment Variables**

Set each variable for the **Production** environment. Do not rely on `.env.local` in production.

### Required — app will not work without these

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard > your project > Connection Details > Connection string |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Your production domain, e.g. `https://roost.app` — no trailing slash |
| `CRON_SECRET` | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Any email, used only for admin panel login |
| `ADMIN_PASSWORD` | Strong random password, e.g. `openssl rand -hex 20` |
| `ADMIN_SESSION_SECRET` | `openssl rand -base64 32` — must be different from `BETTER_AUTH_SECRET` |

### Required — billing breaks without these

| Variable | How to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API keys > Secret key (use `sk_live_...` for production) |
| `STRIPE_PRICE_ID` | Stripe Dashboard > your product > Pricing tab > copy price ID (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Generated when you register the webhook endpoint (Section 4 below) |

### Required — receipt scanning breaks without these

| Variable | How to get it |
|---|---|
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | Azure Portal > your Document Intelligence resource > Keys and Endpoint |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | Same page, Key 1 |

### Recommended

| Variable | Notes |
|---|---|
| `BETTER_AUTH_URL` | Set to `NEXT_PUBLIC_APP_URL`. Helps better-auth resolve redirects correctly on non-Vercel hosts. |

### Not needed in production

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe Checkout is fully server-side. No client-side Stripe.js used.
- `RESEND_API_KEY` — email is not yet implemented.
- `EXPO_ACCESS_TOKEN` — push notifications deferred until iOS app.

### Silent breakage risks

These variables have localhost fallbacks and will not crash the build if missing,
but the app will behave incorrectly in production:

- `NEXT_PUBLIC_APP_URL` — missing means invite links, Stripe redirects, and auth callbacks
  all point to `http://localhost:3000`. Users see broken flows with no error.

---

## 3. Database setup and migration

### Initial setup (first deploy)

```bash
# Point DATABASE_URL at the production Neon database
# then run from your local machine:
DATABASE_URL="postgres://..." npm run db:push
```

Or set DATABASE_URL in your shell:

```bash
export DATABASE_URL="postgres://user:password@host/dbname?sslmode=require"
npm run db:push
```

`db:push` diffs the current Drizzle schema against the live database and applies
the minimum changes needed. It does not drop columns or tables unless you pass `--force`.
It is safe to run multiple times (idempotent).

### Every subsequent deploy with schema changes

The safe deploy order is:

```
1. Run db:push to apply schema changes to production
2. Deploy the app code via git push / Vercel dashboard
3. Verify with smoke test (Section 6)
```

Schema changes first, then code. This order is safe because:
- Drizzle push is additive by default (adds columns/tables, no drops)
- New code that references new columns will work immediately after the push
- Old code running against a schema with extra columns is harmless

> **Do not run `npm run db:migrate`.** There is no migration journal in this repo.
> `db:push` is the only supported path. Running `drizzle-kit migrate` against a database
> without a journal will fail or apply incorrect changes.

> **Do not run `npm run db:seed` against production.** The seed script creates fixed
> test accounts (`admin.free@roost.test`, etc.). It is idempotent but those accounts
> do not belong in a live app.

### Verifying the schema is in sync

```bash
# Run from local with production DATABASE_URL to see what db:push would change
DATABASE_URL="..." npx drizzle-kit push --dry-run
```

If the output is "No changes" the schema is in sync.

---

## 4. Stripe setup

### Step 1: Create a product and price

1. Stripe Dashboard > Products > Create product
2. Name: "Roost Premium"
3. Add price: $4.00 / month, recurring
4. Copy the price ID (starts with `price_`) → set as `STRIPE_PRICE_ID` in Vercel

### Step 2: Register the webhook endpoint

1. Stripe Dashboard > Developers > Webhooks > Add endpoint
2. Endpoint URL: `https://<your-domain>/api/stripe/webhook`
3. Select exactly these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click "Add endpoint"
5. On the endpoint detail page, click "Reveal" under "Signing secret"
6. Copy the value (starts with `whsec_`) → set as `STRIPE_WEBHOOK_SECRET` in Vercel

> **Important:** The signing secret is specific to this endpoint. It is different from your
> API key. Using the wrong value causes all webhooks to return 400 and billing events to be silently dropped.

### Step 3: Activate the Customer Portal

Users reach the portal via Settings > Billing > "Manage billing".
Without this step, clicking that button returns a Stripe API error.

1. Stripe Dashboard > Settings > Billing > Customer portal
2. Click "Activate test link" (test mode) or ensure it is active in live mode
3. No further configuration needed for basic cancel/reactivate flows

### Step 4: Verify KYC / account activation

Live payment acceptance requires Stripe to verify your business identity.
This is done in Stripe Dashboard > Settings > Account details.
Without it, live mode charges will be declined.

### Testing the webhook locally

```bash
# Install Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

The local dev server should log:
```
[stripe.webhook.received] type=checkout.session.completed id=evt_...
```

### Verifying the webhook in production

After deploying, perform a test checkout in Stripe test mode (using `sk_test_...` keys).
Check Vercel function logs for:

```
[stripe.webhook.received] type=checkout.session.completed
[stripe.webhook.handled] outcome=subscription_started
```

If you see `[stripe.webhook.sig_invalid]`, the `STRIPE_WEBHOOK_SECRET` env var is wrong or missing.

If you see `[stripe.webhook.no_household]`, the checkout session metadata is missing `householdId`
— this indicates a code path that bypassed the normal checkout session creation.

---

## 5. Cron job setup and verification

### How crons work in this app

Cron schedules are defined in `vercel.json`. Vercel reads this file automatically when you
deploy. No manual cron registration is needed.

Vercel invokes each cron by calling the route as an HTTP GET with an
`Authorization: Bearer <CRON_SECRET>` header. The routes reject requests without this header.

**CRON_SECRET must be set in Vercel before cron jobs will run successfully.**

### Current cron schedule

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/reminders` | Every 15 min | Fire due reminders, advance recurring |
| `/api/cron/rewards` | Daily 11pm UTC | Evaluate reward rules, create payouts |
| `/api/cron/subscription` | Daily midnight UTC | Expire cancelled premium subscriptions |
| `/api/cron/settlement-reminders` | Daily 10am UTC | Remind payees of pending settlements >7 days |
| `/api/cron/recurring-expenses` | Daily 8am UTC | Create draft recurring expenses, remind on stale drafts |
| `/api/cron/budget-reset` | 1st of month midnight UTC | Reset monthly expense budgets |
| `/api/cron/guest-expiry` | Daily 2am UTC | Remove expired guest household members |

### Verifying crons are registered

1. Vercel Dashboard > your project > **Cron Jobs** tab
2. All 7 routes should appear with their schedules
3. The tab only appears after the first successful deploy that includes `vercel.json`

### Verifying crons are running

Search Vercel function logs for `cron/`:

```
[cron/reminders.start]
[cron/reminders.done] processed=3 durationMs=214
```

Each cron emits a `.start` log when it begins and a `.done` log with result counts and
duration when it finishes. If a cron is running but processing 0 items, that is normal
when there is nothing due.

If a cron route is never logged, check:
1. `CRON_SECRET` is set in Vercel environment variables
2. The route exists (match path in `vercel.json` to actual file in `src/app/api/cron/`)
3. The cron tab in Vercel shows the job is enabled

### Triggering a cron manually (for testing)

```bash
curl -X GET https://<your-domain>/api/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected response: `{"processed": 0}` (or a count if items were due).

---

## 6. Post-deploy smoke test

Run these checks after every production deploy. They cover the critical paths.

### Auth
- [ ] Load `/` — marketing homepage renders, no JS errors in console
- [ ] Load `/login` — login form renders
- [ ] Sign up with a new email — redirected to `/onboarding`
- [ ] Complete onboarding — create a household, reach `/dashboard`
- [ ] Sign out — redirected to `/login`, theme resets to default

### Core features
- [ ] Dashboard loads with tiles visible
- [ ] Create a chore — appears in chore list
- [ ] Add a grocery item — appears in grocery list, check/uncheck works
- [ ] View calendar — month grid renders

### Billing (use Stripe test mode if possible)
- [ ] Settings > Billing — page loads without error
- [ ] Click "Upgrade to Premium" — redirected to Stripe Checkout page
- [ ] (Test only) Complete checkout with test card `4242 4242 4242 4242`
- [ ] Return to `/settings/billing` — shows premium status
- [ ] Vercel logs show `[stripe.webhook.handled] outcome=subscription_started`

### Admin panel
- [ ] Load `/admin` — redirected to `/admin/login`
- [ ] Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- [ ] Overview page shows stats (may be 0 for a fresh deploy)
- [ ] Users page loads
- [ ] Households page loads

### Crons (check logs, not manual trigger)
- [ ] Wait for reminders cron (runs every 15 min) — verify `.start` and `.done` logs appear in Vercel

---

## 7. Routine deploys

For code-only changes (no schema changes):

```bash
git push origin main
# Vercel deploys automatically on push to main
```

Wait for the Vercel deployment to complete, then run the smoke test (abbreviated: auth +
one core feature + check Vercel function logs for errors).

For deploys that include schema changes:

```bash
# 1. Apply schema to production first
DATABASE_URL="<production url>" npm run db:push

# 2. Then deploy code
git push origin main
```

### Checking the deploy status

Vercel Dashboard > your project > Deployments

The most recent deployment shows status (Building / Ready / Error).
Click it to see build logs if something went wrong.

---

## 8. Rollback procedure

### Option A: Instant rollback via Vercel (no code changes needed)

1. Vercel Dashboard > your project > Deployments
2. Find the last known-good deployment
3. Click the three-dot menu on that deployment > **Promote to Production**
4. The previous version is live in under 30 seconds

Use this for: code bugs, runtime errors, bad UI changes.

**This does not roll back schema changes.** If a `db:push` introduced a breaking schema
change, you need Option B.

### Option B: Schema rollback

If `db:push` added a column or table that is causing problems:

1. Roll back the code via Vercel (Option A)
2. Manually reverse the schema change in Neon:
   ```sql
   -- Example: remove a column that was added
   ALTER TABLE some_table DROP COLUMN IF EXISTS new_column;
   ```
   Run this in Neon's SQL editor or via psql.

> **Warning:** Drizzle push does not generate rollback SQL. You must write it manually.
> Before running schema changes in production, know what SQL you would run to reverse them.

### Option C: Full data rollback

Neon supports point-in-time restore (PITR) on paid plans. In the Neon dashboard:
- Your project > Branches > Restore
- Select a time before the bad deploy

This is a last resort. All data written after the restore point is lost.

---

## 9. Incident checklist

Use this when something is broken in production and you need to triage quickly.

### Step 1: Locate the error

**Vercel function logs** — the first place to look for server errors:
- Vercel Dashboard > your project > Logs
- Filter by "Error" or search for the route that is failing
- Structured logs use `[event]` prefix — search for `stripe.webhook`, `cron/`, `receipt.scan`

**Browser console** — for client-side errors visible to the user.

**Neon dashboard** — for database connection or query failures:
- Neon > your project > Monitoring (shows active connections, errors)

### Step 2: Classify the incident

| Symptom | Likely cause | First action |
|---|---|---|
| All users cannot log in | `BETTER_AUTH_SECRET` changed or DB unreachable | Check Neon status, verify env vars |
| Stripe webhooks failing | Wrong `STRIPE_WEBHOOK_SECRET` or route error | Check logs for `stripe.webhook.sig_invalid` |
| Premium not activating after payment | Webhook not registered or householdId missing | Check Stripe dashboard webhook delivery logs |
| Cron jobs not running | `CRON_SECRET` missing or wrong | Check Vercel cron tab, trigger manually |
| Receipt scanning failing | Azure credentials wrong or quota exceeded | Check logs for `receipt.scan.failed`, verify Azure portal |
| App renders but shows errors | Code bug in last deploy | Roll back via Vercel (Section 8, Option A) |
| DB connection errors everywhere | Neon connection pool exhausted | Check Neon monitoring, reduce serverless concurrency |

### Step 3: Stripe-specific diagnosis

If a user paid but is still on free tier:

1. Stripe Dashboard > Developers > Webhooks > your endpoint > Recent deliveries
2. Find the `checkout.session.completed` event
3. Check if it shows "Succeeded" or "Failed"
4. If failed: click the event, see the response body and HTTP status
5. Retry failed webhooks from the Stripe dashboard (button on the event detail page)
6. In Vercel logs, search for the event ID — logs show `id=evt_...` on receipt

If the webhook is succeeding but the household is still free:

1. Check that `households.subscription_status` in the DB is `premium`
   (Neon Dashboard > SQL editor: `SELECT id, subscription_status FROM households WHERE id = '<id>'`)
2. If it is `free`, the webhook handler may have received an event with no `householdId` in metadata —
   search logs for `[stripe.webhook.no_household]`

### Step 4: Database-specific diagnosis

```sql
-- Check recent activity for a household
SELECT * FROM household_activity
WHERE household_id = '<id>'
ORDER BY created_at DESC
LIMIT 20;

-- Check subscription status
SELECT id, name, subscription_status, premium_expires_at, stripe_subscription_id
FROM households
WHERE id = '<id>';

-- Check if a user has a household membership
SELECT hm.*, h.name as household_name
FROM household_members hm
JOIN households h ON h.id = hm.household_id
WHERE hm.user_id = '<user_id>';
```

### Step 5: Communicate and resolve

For any outage affecting billing or data:
1. Roll back the code if a recent deploy caused it (Section 8)
2. Fix forward if the issue is configuration (env var, Stripe dashboard)
3. After resolution, note what happened and update this runbook

---

## Useful references

- Vercel function logs: Vercel Dashboard > your project > Logs
- Vercel cron jobs: Vercel Dashboard > your project > Cron Jobs
- Neon SQL editor: Neon Dashboard > your project > SQL editor
- Stripe webhook deliveries: Stripe Dashboard > Developers > Webhooks > your endpoint
- Stripe test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)
- Azure quota: Azure Portal > your Document Intelligence resource > Metrics > Transactions
- Structured log prefixes: `[cron/`, `[stripe.webhook.`, `[receipt.scan.`, `[analytics.`, `[admin-login]`
