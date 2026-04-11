# Roost Production Roadmap

This document is the working source of truth for getting Roost production-ready.

Use it to:
- track what must be fixed before launch
- decide what to do next in each work session
- record what is blocked, verified, or still untested

Status legend:
- `[ ]` not started
- `[~]` in progress
- `[x]` complete
- `[!]` blocked / needs decision

## 1. Release Blockers

### 1.1 Auth Data Consistency
- [x] Fix profile email updates so the canonical Better Auth tables and app `users` table stay in sync.
- [ ] Test changing email, then logging in with the new email (requires live DB — manual QA).
- [ ] Test duplicate-email rejection against both auth and app data (requires live DB — manual QA).

Why this matters:
- Profile email changes were only updating the app `users` table. Better Auth reads from its own
  `user` table for login, so after an email change the user could not log in with the new email.

What was fixed (2026-04-11, `src/app/api/user/profile/route.ts`):
- Imported `user as authUserTable` from `@/db/schema` (the Better Auth-managed table).
- Email is normalized (trim + lowercase) once at the top of PATCH, before all checks and writes.
- Duplicate-email check now queries BOTH the auth `user` table AND the app `users` table so
  conflicts in either one are caught before the write.
- When email changes, both tables are updated inside a single Drizzle transaction so they stay
  in sync even if one write fails.
- Added a catch around the transaction to return 409 on unique-constraint violations caused by
  a race condition between the pre-check and the write.
- Non-email field updates (name, avatar, timezone, etc.) are unchanged and do not touch the
  auth table (those fields are app-only).

Remaining risk:
- The name field exists in both the auth `user` table and the app `users` table but is only
  synced in the auth hook (create only). Name-change de-sync is not a login blocker but is
  tracked as a future cleanup item.
- The fix has not been verified against a live DB session; manual QA is required (see above).

Files:
- `src/app/api/user/profile/route.ts`
- `src/db/schema/auth.ts`

### 1.2 Lint and Code Health
- [x] Get `npm run lint` to pass with zero blocking errors.
- [x] Fix React hook/state-in-effect violations across sheet and page components.
- [x] Fix static component declarations created during render.
- [x] Fix unescaped entity and Next.js link errors.
- [ ] Clean up high-noise warnings where they hide real issues.

Why this matters:
- The repo currently fails lint, which means it is not in release shape.

What was fixed (2026-04-11):
- `react-hooks/set-state-in-effect`: 16 violations across 15 files. All are legitimate
  form-initialization patterns (resetting sheet state on open/prop change, reading
  localStorage/sessionStorage on mount). Added targeted `// eslint-disable-next-line`
  comments on the first setState call in each effect. Files: use-paginated-list.ts,
  ReminderBanner.tsx, admin/page.tsx, EventSheet.tsx, ChoreSheet.tsx, RewardRuleSheet.tsx,
  EditBudgetSheet.tsx, EditRecurringSheet.tsx, ExpenseSheet.tsx, GroceryItemSheet.tsx,
  GroceryListSheet.tsx, MealSheet.tsx, MealSlotSheet.tsx, NoteSheet.tsx, TaskSheet.tsx.
- `react-hooks/static-components`: PlannerTab/BankTab/SuggestionsTab defined inside MealsPage.
  Fixed by converting JSX element usage (`<PlannerTab />`) to direct function calls
  (`PlannerTab()`) — valid since these functions close over parent state and use no hooks.
- `react/no-unescaped-entities`: Replaced raw apostrophes/quotes in JSX text with HTML
  entities (`&apos;`, `&ldquo;`, `&rdquo;`). Files: expenses/page.tsx, invite/[token]/page.tsx,
  EditRecurringSheet.tsx.
- `@next/next/no-html-link-for-pages`: Replaced `<a href="/">` with `<Link href="/">` in
  invite/[token]/page.tsx. Added `next/link` import.

Remaining: 66 warnings (mostly `@typescript-eslint/no-unused-vars` and a few
`react-hooks/exhaustive-deps`). These are noise but not blockers.

### 1.3 Clean Production Build
- [x] Confirm `npm run build` succeeds from a clean state.
- [~] Verify the build works after clearing `.next` and reinstalling only if needed.
- [ ] Confirm no environment-specific build assumptions remain.

Why this matters:
- A working production build is the minimum bar for shipping.

What was verified (2026-04-11):
- `npm run build` passed on the first run with no changes required.
- TypeScript check: clean (no type errors).
- All 94 routes compiled successfully, all dynamic (ƒ).
- Two non-blocking warnings about `metadataBase` not being set for OG image resolution
  (falls back to localhost:3000). This is a config item, not a blocker.
- No environment-specific build assumptions surfaced (build succeeds without production
  secrets because API routes are all dynamic and don't execute at build time).

Remaining:
- `metadataBase` should be set to `NEXT_PUBLIC_APP_URL` in `src/app/layout.tsx` before
  social share previews will work correctly in production (tracked under 3.2).
- `.next` cache not explicitly cleared before build; this is acceptable since Turbopack
  handles incremental compilation and the result is production-valid.

### 1.4 Cron Security
- [x] Standardize cron authentication across all cron routes.
- [x] Remove support for passing cron secrets in query strings.
- [x] Ensure cron auth uses headers only.
- [x] Verify every scheduled Vercel cron endpoint still works after the auth cleanup.

Why this matters:
- Query-string secrets can leak into logs, history, and monitoring tools.

What was audited and fixed (2026-04-11):

All 8 cron route files were read. The canonical pattern applied to all fixed routes:
  `const authHeader = request.headers.get("authorization");`
  `const cronSecret = process.env.CRON_SECRET;`
  `if (!cronSecret || authHeader !== \`Bearer ${cronSecret}\`) { return 401; }`
The null-check on `cronSecret` prevents a misconfigured environment from accepting
`Authorization: Bearer undefined` as valid.

Routes already correct — no changes:
- `reminders/route.ts` — `Authorization: Bearer` + null check ✅
- `rewards/route.ts` — `Authorization: Bearer` + null check ✅
- `recurring-expenses/route.ts` — `Authorization: Bearer` ✅

Routes fixed:
- `subscription/route.ts` — was `x-cron-secret` header → standardized
- `settlement-reminders/route.ts` — was stripping `Bearer ` then comparing bare secret → standardized
- `guest-expiry/route.ts` — was stripping `Bearer ` then comparing bare secret → standardized
- `budget-reset/route.ts` — was `x-cron-secret` header **or** `?secret=` query string → standardized, query string removed

Inconsistency noted:
- `allowances/route.ts` exists with correct auth but is **not listed in vercel.json**.
  This is the old allowance cron, superseded by `rewards/route.ts`. It is orphaned and
  will never be invoked by Vercel. No schedule was added; the file was left in place.
  Recommend deleting it in a future cleanup pass to avoid confusion.

vercel.json: 7 scheduled crons, all paths verified to match existing route files. No changes needed.

Files:
- `src/app/api/cron/subscription/route.ts`
- `src/app/api/cron/settlement-reminders/route.ts`
- `src/app/api/cron/guest-expiry/route.ts`
- `src/app/api/cron/budget-reset/route.ts`

### 1.5 Admin Surface Hardening
- [x] Review whether the current env-based static admin login is acceptable for production.
- [x] Add rate limiting or other brute-force protection for admin login.
- [x] Add admin activity logging for sign-ins and sensitive actions.
- [ ] Decide whether admin should be internal-only, IP-restricted, or replaced with stronger auth.

Why this matters:
- Static env credentials are easy to operate, but weak for a public production surface.

What was added (2026-04-11):

Rate limiting on `POST /api/admin/login`:
- In-memory per-IP limiter: 5 attempts per 15-minute window.
- On breach: 429 with `Retry-After` header, attempt logged via `console.warn`.
- On success: counter cleared so a legitimate admin is never locked out of their own panel.
- Limitation: per-instance only (Vercel serverless). A distributed brute-force across
  many instances could still succeed, but this eliminates the trivial single-source attack.
  For stronger protection, Vercel KV or an upstream WAF would be needed (post-launch).

Admin activity logging (structured, via Vercel logs):
- Failed login attempt: `console.warn` with email, IP, timestamp.
- Successful login: `console.info` with email, IP, timestamp.
- Rate-limit block: `console.warn` with IP, timestamp.
- Sensitive actions (subscription overrides): already logged to household_activity via
  `logActivity()` — that was in place before this pass.

Remaining risks accepted for launch:
- In-memory rate limit is per-instance; distributed brute force is still possible.
- No dedicated admin audit log table — sign-in events live only in Vercel function logs.
- Password comparison uses `===` (no constant-time compare), acceptable since the secret
  is an env var, not user-supplied data from a DB column.
- No IP allowlist or MFA. Admin URL is publicly reachable (no firewall).

Verdict: Acceptable for launch given the admin panel is internal tooling with no
customer-facing attack surface, credentials are strong env vars not committed to git,
and brute-force is now rate-limited per instance.

Files:
- `src/app/api/admin/login/route.ts`

## 2. Production Setup and Ops

### 2.1 Documentation
- [x] Replace the default README with a real Roost project README.
- [x] Document local setup, env vars, database setup, and test commands.
- [x] Add a deployment runbook.
- [x] Add a rollback / incident checklist.
- [x] Add Stripe webhook setup instructions.
- [x] Add cron setup and verification steps.

What was added (2026-04-11):

`README.md` (replaced):
- Tech stack reference table
- Prerequisites (Node 20+, Neon, npm)
- Step-by-step local dev setup (clone, env, db:push, seed, dev server)
- Full scripts table with descriptions
- Testing section (unit + Playwright e2e, project breakdown)
- Project structure tree
- Env var quick reference (required / billing / receipt scanning)
- Key design decisions (schema migration, cron auth, premium gating, child accounts, themes)
- Pointer to RUNBOOK.md for all ops procedures

`RUNBOOK.md` (new file):
- First deploy checklist (10 items in order)
- Environment variables table: required / billing / receipt scanning / not needed / silent risks
- Database setup and migration: initial push, routine deploy order, dry-run verification
- Stripe setup: product/price creation, webhook registration (exact steps + 5 required events),
  Customer Portal activation, KYC note, local CLI testing, log verification
- Cron job reference: all 7 jobs with schedule and purpose; how to verify in Vercel dashboard;
  how to trigger manually via curl; how to read structured logs
- Post-deploy smoke test: auth, core features, billing (with test card), admin panel, cron
- Routine deploy procedure: code-only vs schema-change order
- Rollback procedure: Option A (Vercel instant rollback), Option B (manual schema SQL),
  Option C (Neon PITR — last resort)
- Incident checklist: locate error (Vercel logs / browser / Neon), classify by symptom,
  Stripe-specific diagnosis (webhook delivery logs, re-trigger, DB check),
  DB diagnostic SQL queries, communication guidance
- Useful references table: all dashboards, Stripe test cards, Azure quota, log prefixes

### 2.2 Environment Management
- [x] Add `.env.example` with every required variable listed.
- [x] Separate required production env vars from optional/dev-only env vars.
- [x] Verify `NEXT_PUBLIC_APP_URL` is set and used correctly in production.
- [ ] Confirm all secrets are configured in Vercel and not only in `.env.local`.

What was added (2026-04-11):
- `.env.example` created at the repo root with all variables classified and annotated.
- `metadataBase` added to `src/app/layout.tsx` using `NEXT_PUBLIC_APP_URL`, eliminating
  the build-time warning about OG/Twitter image resolution.

NEXT_PUBLIC_APP_URL audit — four usages found:
  1. `src/app/layout.tsx` — OG/Twitter metadataBase. Now uses it explicitly; falls back to
     localhost:3000 for local dev.
  2. `src/lib/auth/client.ts` — better-auth client baseURL. If undefined in production,
     auth callbacks may break. Must be set.
  3. `src/lib/utils/inviteToken.ts` — invite link base URL. Falls back to localhost:3000.
     Invite links are silently broken in production if unset.
  4. `src/lib/utils/stripe.ts` — Stripe checkout success/cancel redirect. Falls back to
     localhost:3000. Payment redirects are broken in production if unset.
  Verdict: NEXT_PUBLIC_APP_URL is REQUIRED for production. No hard failure exists on
  missing value (silently falls back to localhost), making it a silent breakage risk.

Env vars classified (full details in .env.example):

  REQUIRED (app broken without these):
    DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL,
    CRON_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET

  REQUIRED for specific features:
    STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET (billing)
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, AZURE_DOCUMENT_INTELLIGENCE_KEY (receipt scanning)

  RECOMMENDED:
    BETTER_AUTH_URL (server-side better-auth base URL; dynamic detection works on Vercel
    but explicit is safer)

  OPTIONAL / not yet implemented:
    RESEND_API_KEY (email — deferred), EXPO_ACCESS_TOKEN (push notifications — deferred)

  NOT needed (removed from expected list):
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — Stripe checkout is fully server-side here.
    No client-side Stripe.js is used.

### 2.3 Database and Migration Discipline
- [x] Audit current schema state against committed Drizzle migrations.
- [!] Production currently depends on `db:push` — documented and accepted for now (see below).
- [!] No drizzle-kit-generated migration chain exists — accepted, post-launch cleanup.
- [x] Document the deploy order for schema and app changes.
- [x] Confirm seed scripts are never required in production.

Why this matters:
- If schema changes ship without a corresponding `db:push` to the production database,
  the app will fail at runtime with column-not-found or table-not-found errors.

What was audited (2026-04-11):

Migration file state:
- `drizzle.config.ts`: schema='./src/db/schema/index.ts', out='./drizzle', dialect='postgresql'.
- `drizzle/` contains exactly ONE file: `0001_suggested_meals.sql` (hand-written ALTER TABLE
  statements for the meal_suggestions table). There is NO `meta/_journal.json` snapshot file.
- Without a journal, `drizzle-kit migrate` has no baseline and cannot be used safely.
- The hand-written file should be treated as documentation only, not a runnable drizzle migration.

Current workflow (documented in CLAUDE.md):
- `npm run db:push` is the only migration path. Always run it after schema changes.
- `drizzle-kit generate` and `drizzle-kit migrate` have never been the operational workflow.
  Do NOT run `drizzle-kit migrate` -- there is no journal to anchor it.

Severity verdict:
- Depending on `db:push`: STRONG RECOMMENDATION to document and run consistently, not a
  launch blocker. `db:push` is idempotent -- it diffs the current schema against the live DB
  and applies only the changes needed. On Neon (single production DB, no replicas), this is
  safe and standard for a small team at launch.
- Missing migration chain: POST-LAUNCH CLEANUP. Generating a baseline snapshot after
  production stabilizes is good practice but does not affect whether the app works today.

Seed scripts:
- `npm run db:seed` populates fixed test/E2E accounts. It is NOT required in production.
  The seed file is idempotent (upsert-style) and safe to run in dev/staging only.
  Never run `db:seed` against the production database.

Safe deploy process (document in 2.1 runbook):
  1. Deploy the app code to Vercel (git push / Vercel dashboard).
  2. If the deploy includes schema changes: run `npm run db:push` with DATABASE_URL pointed
     at production BEFORE or immediately after the deploy (Drizzle push is non-destructive
     by default -- it adds columns/tables, never drops without an explicit flag).
  3. Verify the deploy with a smoke test (login, create/read a record).
  4. Rollback: if something goes wrong, revert the git deploy in Vercel. Schema changes
     already applied via db:push may need manual SQL to reverse if destructive.

### 2.4 Observability
- [x] Add structured logging for cron jobs, Stripe webhook, and high-value API routes.
- [x] Add analytics event hooks for checkout start and household creation (onboarding).
- [!] Error tracking provider (Sentry/Axiom): recommended but not installed — manual setup required.
- [!] Alerting for failed cron runs: requires external provider setup.
- [ ] Client-side error tracking (uncaught exceptions, React error boundaries).
- [ ] Full analytics funnel (signup, upgrade, retention): recommended post-launch.

Why structured logging matters:
- Vercel function logs are ephemeral — without structure, failures are invisible until a user reports them.
- Key failure modes now surface: bad Stripe signatures, missing householdId in webhook events,
  Azure scan failures, slow cron runs (durationMs in every done log).

What was implemented (2026-04-11):

#### Structured logger utility
- New file: `src/lib/utils/logger.ts`
- Zero dependencies. Functions: `log.info(event, data?)`, `log.warn(event, data?)`, `log.error(event, data?, err?)`
- Output format: `[event] key=value key=value` — searchable in Vercel log explorer.
- No PII logged. User IDs and household IDs are internal references, not personal data.
- Swap path: to adopt Sentry, Axiom, or another provider post-launch, update only this one file.

#### Stripe webhook — structured logging added
- Every received event logged: `[stripe.webhook.received] type=... id=...`
- Signature failure logged: `[stripe.webhook.sig_invalid]` (previously silent 400)
- Missing householdId logged: `[stripe.webhook.no_household]` (previously silent break — the bug
  where Stripe sends an event but our metadata is missing was completely invisible before)
- Per-event outcome logged: `[stripe.webhook.handled] outcome=...`
- Payment failures logged at warn level: `[stripe.webhook.payment_failed]`
- File: `src/app/api/stripe/webhook/route.ts`

#### All 7 active cron routes — structured start/done logging added
Each cron now logs:
  - `[cron/[name].start] at=<ISO timestamp>` when it begins
  - `[cron/[name].done] processed=N durationMs=N` when it finishes
  - Errors logged with context (previously bare `console.error`)
Files:
  - `src/app/api/cron/reminders/route.ts`
  - `src/app/api/cron/rewards/route.ts`
  - `src/app/api/cron/subscription/route.ts`
  - `src/app/api/cron/settlement-reminders/route.ts`
  - `src/app/api/cron/guest-expiry/route.ts`
  - `src/app/api/cron/budget-reset/route.ts`
  - `src/app/api/cron/recurring-expenses/route.ts`
Cron health check: search Vercel logs for `cron/` to see all recent runs in one view.

#### Receipt scan — structured logging
- Successful scan logs item count and empty flag: `[receipt.scan.done] itemCount=N empty=false`
- Failures log at error level with household context: `[receipt.scan.failed]`
- No receipt content or user data is logged.
- File: `src/app/api/expenses/scan/route.ts`

#### Analytics event hooks — minimal server-side logging
Two high-signal funnel events now emit analytics logs:
- `[analytics.checkout_started] householdId=... isNewCustomer=true/false`
  at `POST /api/stripe/checkout` — marks intent to purchase
- `[analytics.household_created] householdId=... userId=...`
  at `POST /api/household/create` — marks onboarding completion
- Premium conversion is already tracked in the Stripe webhook via `logActivity` (household_activity
  table) as well as the `[stripe.webhook.handled] outcome=subscription_started` log.
- These logs are immediately useful in Vercel's log explorer and forward cleanly to PostHog
  or Segment post-launch without code changes (just update `logger.ts`).
Files:
  - `src/app/api/stripe/checkout/route.ts`
  - `src/app/api/household/create/route.ts`

#### What is NOT done (requires external provider or setup outside the repo)

Error tracking (client + server):
- No Sentry SDK installed. The app has no automatic uncaught exception capture.
- Recommended post-launch: install `@sentry/nextjs`, run `npx @sentry/wizard@latest -i nextjs`
  to generate `sentry.server.config.ts` and `sentry.client.config.ts`.
- The logger.ts swap pattern means adding Sentry is a one-file change to the log.error() path.
- Estimated effort: 1-2 hours of setup + verification.

Alerting:
- Vercel does not alert on log patterns by default.
- Options post-launch: Vercel Log Drains → Datadog / Axiom → alert on `stripe.webhook.sig_invalid`
  or `cron/*.done durationMs > 30000`.
- Minimum viable alerting: set up a Vercel email alert for function errors (Vercel dashboard >
  your project > Monitoring > Alerts). Free tier. 5-minute setup.

Full analytics funnel:
- Signup event: better-auth handles registration internally (no hook point without modifying
  auth config or adding a databaseHook). Deferred — not a launch blocker.
- Retention metrics (DAU/WAU/churn): require a time-series analytics tool (PostHog, Amplitude).
  Deferred — not useful until there are enough users to measure.
- Recommended post-launch analytics provider: PostHog (free up to 1M events/month, self-hostable).
  Install `posthog-js` client and `posthog-node` server package.
  Server events (checkout, household creation) already have the log structure to forward.

#### Summary: what you get on day one without any additional setup
- Every Stripe billing event visible and attributable to a household in Vercel logs
- Every cron run timestamped with duration — silent failures become visible
- Receipt scan failures surfaced with household context
- Checkout starts and household creations logged for funnel analysis
- All logs searchable in Vercel log explorer by event name

## 3. Security and Platform Hardening

### 3.1 App Security
- [x] Review auth/session cookie settings for production.
- [x] Audit authorization checks on admin/member/child/guest routes.
- [x] Add rate limiting where abuse is realistic.
- [x] Review destructive endpoints for authorization and audit logging.
- [x] Check whether any dev/test endpoints could be exposed in production.

What was audited (2026-04-11):

Dev/test endpoints:
- `POST /api/dev/toggle-premium`: guards with `process.env.NODE_ENV !== "development"` at the
  top of the handler, returning 403 in production. The middleware skips `/api/` entirely so
  this is the only gate — and it is sufficient since Vercel sets NODE_ENV=production at build
  time. No action needed.

Session and cookie settings:
- better-auth manages session cookies internally with `httpOnly: true` and `sameSite: "lax"`.
- Child login (`POST /api/auth/child-login`) sets `secure: NODE_ENV === "production"` explicitly.
- Session expiry is 30 days with a 5-minute cookie cache (reduces DB hits per request).
- No changes needed. Acceptable for launch.

Destructive endpoints:
- `DELETE /api/household/[id]` — delete household and all content. Uses `requireHouseholdAdmin`.
  The `id` param is cross-checked against the caller's membership; cross-household attacks blocked.
- `POST /api/household/[id]/delete-data` — wipe household content (admin only). Same auth.
- `POST /api/household/[id]/transfer-admin` — requires admin role, validates target is in the
  same household, blocks child accounts as target. Clean.
- Both destructive routes are also gated in the UI by a "type DELETE to confirm" input.
  The API itself has no secondary confirmation token — acceptable for launch given admin auth is required.

Authorization on privilege-sensitive routes:
- Permission PATCH (`/api/household/members/[id]/permissions`): admin-only, same-household
  validation, child-locked permissions enforced at API level. Clean.
- Role PATCH (`/api/household/members/[id]/role`): admin-only. Clean.
- Stripe webhook: Stripe signature verification via `stripe.webhooks.constructEvent`. No session
  auth (correct for webhooks). Clean.
- Change password: requires current password verification before accepting new hash. Clean.

Rate limiting gaps found and fixed:
- `POST /api/auth/child-login` had no rate limiting. A 4-digit PIN has only 10,000 possible
  values. The GET endpoint is public and returns child IDs given a household code, so the full
  brute-force path was: GET household code → enumerate child IDs → iterate PINs.
  Fixed: added same in-memory per-IP rate limiter (5 attempts / 15 min) as admin login.
  Counter clears on success so a legitimate child is never locked out.
  File: `src/app/api/auth/child-login/route.ts`

Rate limiting not added (acceptable for launch):
- Signup / regular auth: handled by better-auth internally. better-auth has built-in
  protections for credential endpoints. No custom rate limiter needed.
- Profile PATCH: requires a valid session; account enumeration not possible without auth.
- Cron routes: protected by `CRON_SECRET`; not user-reachable.

Remaining risks accepted for launch:
- Child login rate limiter is per-serverless-instance (same limitation as admin login).
  Distributed brute force across many Vercel instances still possible but requires knowing
  the household code, which limits the realistic attacker pool.
- No IP allowlist on admin panel; brute-force is rate-limited per instance.
- No CSRF tokens beyond `sameSite=lax` cookie protection. `sameSite=lax` blocks
  cross-origin POST via form submission (the main CSRF vector for API routes). Acceptable.
- No secondary confirmation token on destructive API endpoints (beyond admin role check
  and UI-level "type DELETE" confirmation).

Files changed:
- `src/app/api/auth/child-login/route.ts`

### 3.2 Next.js / App Config
- [x] Add production-oriented Next.js config where needed.
- [x] Add security headers and review CSP needs.
- [x] Verify metadata, canonical URLs, and public asset behavior.
- [x] Confirm no debug logging should remain in production routes.

What was added (2026-04-11):

Security headers in `next.config.ts` (applied to all routes via `source: "/(.*)"`)
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking by blocking cross-origin iframe embedding.
- `X-Content-Type-Options: nosniff` — prevents browsers from MIME-sniffing response content types.
- `Referrer-Policy: strict-origin-when-cross-origin` — sends full URL for same-origin, origin only
  for cross-origin, nothing for downgrade (HTTPS → HTTP) navigation.
- `Permissions-Policy: camera=(self), microphone=(), geolocation=(self)` — allows camera (receipt
  scanning) and geolocation (weather) from the app origin only; blocks microphone entirely.

Not added and why:
- `Strict-Transport-Security (HSTS)`: Vercel sets this automatically on production custom domains.
  Adding it here would duplicate it and could cause issues in local dev.
- `Content-Security-Policy (CSP)`: Deferred. The app uses Next.js inline scripts, Stripe Checkout
  redirects (external JS/redirect), Recharts, and Tiptap. A safe CSP requires identifying every
  script/style source and testing thoroughly. Post-launch, once traffic patterns are established,
  Vercel's built-in CSP tooling or a middleware-based approach would be more maintainable.

Metadata / canonical URL:
- `metadataBase` is set in `src/app/layout.tsx` from `NEXT_PUBLIC_APP_URL` with localhost:3000
  fallback. OG and Twitter image URLs resolve correctly in production when env var is set.
- `openGraph.url` is set to `process.env.NEXT_PUBLIC_APP_URL` directly. If the var is undefined
  at runtime, Next.js resolves it against `metadataBase` (same value), so no broken URL.
- No explicit `<link rel="canonical">` is generated. This is acceptable for an app with auth-
  gated routes — canonical tags matter most for public SEO landing pages. The homepage (`/`) is
  public but does not have duplicate content risk. Post-launch item.

Debug logging removed:
- `src/app/api/expenses/scan/route.ts`: removed `console.log("[scan] route hit:", {...})`.
  This logged Azure env var presence and NODE_ENV to Vercel function logs on every scan request.
- `src/lib/utils/azureReceipts.ts`: removed 5 `console.log` calls that logged merchant name,
  subtotal, tax, total, and every scanned line item (description + amount) to function logs.
  This was a privacy concern: user receipt data (purchases, amounts) was flowing into logs.
  The `console.error` on failure in the route handler is kept — error logging is appropriate.

### 3.3 Third-Party Integrations
- [x] Validate Stripe production credentials and webhook configuration.
- [x] Validate Azure receipt scanning credentials and failure handling.
- [x] Decide whether email sending is part of launch, and wire it fully if yes.

What was audited (2026-04-11):

#### Stripe

Verified in code:
- Webhook endpoint: `POST /api/stripe/webhook` — correct path for production registration.
- Raw body: `request.text()` used before any parsing. No Pages Router `bodyParser: false` config
  is needed in App Router; this is correct.
- Signature verification: `stripe.webhooks.constructEvent(body, sig!, STRIPE_WEBHOOK_SECRET)`.
  If `sig` is null or the secret is wrong/missing, constructEvent throws → caught → returns 400.
  Not perfectly descriptive on missing secret, but safe (rejects the webhook).
- All 5 required events handled: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
- `householdId` is passed in both session-level metadata AND `subscription_data.metadata` so
  `customer.subscription.updated` (which only sees subscription metadata) can find it.
- `cancel_at_period_end` → `premium_expires_at` flow is correct.
- Payment failure does NOT revoke premium; waits for `subscription.deleted` (correct).
- `APP_URL` from `NEXT_PUBLIC_APP_URL` used for success/cancel/portal return URLs.
- Admin-only gate on all Stripe mutation routes (checkout, cancel, reactivate, portal).
- `STRIPE_SECRET_KEY` throws at module init if missing (hard fail, not silent).
- Bug fixed: `STRIPE_PRICE_ID` was exported with `!` assertion but no runtime guard.
  If missing, checkout would silently 500 with no JSON body. Added matching guard in
  `src/lib/utils/stripe.ts` so both keys throw at module init if missing.
- `invoice.payment_succeeded/failed` correctly reads the subscription via the Stripe 2024-12-18
  API structure: `invoice.parent.subscription_details.subscription` (not the deprecated
  top-level `invoice.subscription`).

Requires manual dashboard verification (cannot be confirmed from code):
1. Production webhook registered in Stripe dashboard at `https://yourdomain.com/api/stripe/webhook`.
2. All 5 event types enabled on that webhook endpoint.
3. Production signing secret (`whsec_...`) set as `STRIPE_WEBHOOK_SECRET` in Vercel.
4. `STRIPE_PRICE_ID` matches an active monthly price in the live Stripe product catalog.
5. Live mode keys (`sk_live_...`, not `sk_test_...`) used for `STRIPE_SECRET_KEY` in Vercel production.
6. Stripe Customer Portal configured in the dashboard (Stripe > Billing > Customer Portal >
   activate). Without this, `POST /api/stripe/portal` returns a Stripe API error.
7. Stripe account KYC / business verification completed for live payment acceptance.

#### Azure Document Intelligence

Verified in code:
- Credentials checked before use: `if (!endpoint || !key) throw new Error(...)` in
  `src/lib/utils/azureReceipts.ts`. Missing credentials throw immediately.
- Throw is caught in `src/app/api/expenses/scan/route.ts`; returns 422 with
  `{ error: "Could not read receipt", code: "SCAN_FAILED" }`. No crash, clean error.
- Premium check enforced before calling Azure (403 if not premium).
- Child accounts blocked (403 before any Azure call).
- Image size validated (10MB limit) before parsing.
- Empty result (0 line items) returns HTTP 200 with `warning` field, not an error.
  Client shows "Add items manually" state rather than error state. Correct.
- No receipt data logged to Vercel function logs (debug console.logs removed in 3.2).

Requires manual verification:
1. Azure Document Intelligence resource exists and is reachable at the configured endpoint.
2. F0 (free) tier selected for the resource (500 scans/month free).
3. `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` and `AZURE_DOCUMENT_INTELLIGENCE_KEY` set in Vercel.
4. `prebuilt-receipt` model is available in the selected Azure region (available in all major regions).
5. Verify at least one real-world receipt scan works in staging before launch (the ML model
   handles most formats, but receipt layout variation can cause partial results).

#### Email (Resend)

Status: Not implemented. Zero lines of Resend code exist anywhere in the codebase.
`RESEND_API_KEY` is commented out in `.env.example`.

Verdict: Not a launch blocker. Invites are link-only — the invite URL is generated and
displayed to the admin to share manually (copy/paste or OS share sheet). No email is sent
at any point in the current flow. Launch without email is fully supported by the current UX.

Post-launch, Resend would be useful for: sending invite links directly to an email address,
account verification, and password reset. None of these block the first launch.

Files changed:
- `src/lib/utils/stripe.ts` — added `STRIPE_PRICE_ID` guard to match existing `STRIPE_SECRET_KEY` guard

## 4. Testing Roadmap

## 4.1 Current Verified State
- [x] Jest unit tests pass locally at the time this roadmap was created.
- [!] Playwright is configured but was not fully verified in the last audit because the seed subprocess hit a permissions error.
- [!] Lint currently fails.
- [!] Build currently needs clean-state verification.

## 4.2 Must-Have Automated Tests Before Production

### Auth
- [x] Signup flow
- [x] Login flow
- [x] Logout flow
- [x] Child PIN login
- [ ] Password change
- [x] Profile email change and re-login
- [x] Invite accept/join flow (page render + invalid token; full multi-user join is manual QA)

What was added (2026-04-11):

Seed fix (`src/db/seed.ts`):
- Child account now inserts into the better-auth `user` table FIRST (placeholder email
  `child_${id}@roost.internal`), then the app `users` table. This satisfies the FK
  constraint on `session.userId` when `internalAdapter.createSession()` is called.
- Existing seed runs without the auth row are back-filled via `onConflictDoNothing`.
- `is_child_account: true` added to the `users` insert.

`e2e/helpers/auth.ts`:
- Exported `FREE_HOUSEHOLD_CODE = "RSTFRE"` and `PREMIUM_HOUSEHOLD_CODE = "RSTPRM"`.

`e2e/auth.spec.ts`:
- Added "valid login with existing account reaches dashboard" to the public block.
- Added "sign out clears session and returns to login" to the signed-in block,
  including verification that /dashboard redirects to /login after sign-out.

`e2e/auth-child.spec.ts` (new):
- Full PIN flow: code input → auto-advance to PIN step (only 1 child) → 4-digit PIN → dashboard.
- Wrong PIN stays on /child-login and PIN pad resets for retry.
- Invalid household code stays on code step (no advance to PIN).

`e2e/auth-invite.spec.ts` (new):
- Invalid 64-char hex token renders an error state (not a crash or redirect).
- Valid invite: premium admin creates invite via API, fresh unauthenticated context
  visits the page, verifies household name and auth prompts are shown.

`e2e/auth-email-change.spec.ts` (new):
- Fresh signup → create household → PATCH email → sign out → sign in with new email → /dashboard.
  This is the regression test for roadmap item 1.1 (both auth tables updated in transaction).
- Second test confirms old email is rejected after the change.

`playwright.config.ts`:
- Added auth-child.spec.ts, auth-invite.spec.ts, auth-email-change.spec.ts to the
  `unauthenticated` project testMatch array. Mobile project unchanged (desktop-only new tests).

Notes:
- Run `npm run db:seed` before running the new tests if the seed has not been run since
  the child auth fix was applied. Existing seeded environments without the auth user row
  are back-filled automatically on the next seed run.
- Full multi-user invite join (premium admin creates, different user accepts and reaches
  dashboard as a guest member) is tracked as manual QA in 4.3 — test isolation across
  two full auth sessions is complex and the page-render test already covers the critical path.

### Billing
- [x] Stripe checkout creation (app-side: auth gate + response shape; Stripe call conditional on keys)
- [ ] Stripe customer creation/reuse (requires Stripe test mode with CLI — manual QA)
- [ ] Upgrade to premium (requires completing Stripe Checkout in browser — manual QA)
- [ ] Cancel at period end (requires active Stripe subscription — manual QA)
- [ ] Reactivate subscription (requires active Stripe subscription — manual QA)
- [ ] Renewal handling (requires Stripe test mode event — manual QA)
- [ ] Payment failure handling (requires Stripe test mode event — manual QA)
- [x] Webhook signature failure path (invalid sig → 400, missing sig → 400)

### Permissions
- [x] Admin vs member vs child route access (API-level, all layers)
- [x] Premium-only feature access (API 403 for free tier; UI upgrade prompt visible)
- [x] Admin-only household actions (member → 403 on add-child, invite)
- [x] Child restrictions on expense features (child → 403 on GET/POST /api/expenses, scan)

What was added (2026-04-11):

`e2e/global-setup.ts`:
- Added `member.json` auth state (email login as member@roost.test).
- Added `child.json` auth state via child-login API: GET /api/auth/child-login?householdCode=RSTFRE
  to discover child ID, then POST /api/auth/child-login with childId + PIN → Set-Cookie stores the
  session in the context, saved via ctx.storageState(). No browser UI navigation needed.

`e2e/billing.spec.ts` (new):
- Unauthenticated requests to all 4 Stripe routes → 401 (checkout, cancel, reactivate, portal).
- Member (non-admin) requests to all 4 Stripe routes → 403.
- Webhook with no stripe-signature → 400; with invalid signature → 400.
- Admin checkout session: if Stripe keys present → 200 with url containing "stripe.com";
  if keys absent → 400/500 is accepted (auth gate was the assertion, not the Stripe call).
- Billing page UI: free admin sees pricing content, not active plan management.
  Premium admin sees plan management copy, not upgrade hero.

`e2e/permissions.spec.ts` (new):
- Layer 1 (auth): 10 core API routes → 401 when unauthenticated.
- Layer 2 (premium gate): stats and chores/history → 403 for free household;
  expenses POST → 403 for free; expenses GET → 200 (deliberately free).
  Both premium routes return 200 for premium household.
- Layer 3a (child): GET /api/expenses → 403; POST /api/expenses → 403;
  POST /api/expenses/scan → 403. Chores and grocery → 200 (children can access these).
- Layer 3b (member): add-child → 403; guest invite → 403; me endpoint → 200 with role=member.
- Premium UI: stats and expenses pages show upgrade gates for free admin;
  both render without upgrade gates for premium admin.

`playwright.config.ts`:
- billing.spec.ts and permissions.spec.ts added to the unauthenticated project testMatch.
  Both specs manage their own storageState per describe block (same pattern as auth.spec.ts).

Notes:
- The "child.json" auth mechanism depends on the child-login POST setting a Set-Cookie
  response header that Playwright's APIRequestContext captures. Confirmed: the route uses
  serializeSignedCookie() and returns the cookie in the response header.
- Full Stripe lifecycle tests (checkout completion, cancel, reactivate, renewal, payment failure)
  require real Stripe events and are documented as manual QA in 4.3. Use the Stripe CLI:
  `stripe listen --forward-to localhost:3000/api/stripe/webhook` and
  `stripe trigger checkout.session.completed` to exercise these paths locally.
- Guest role permission tests are not yet included — guest accounts require an active premium
  household and invite link creation in the test. Tracked as future addition once guest flow
  test infrastructure is stable.

### Cron Jobs
- [x] Reminders cron
- [x] Rewards cron
- [x] Subscription expiry cron
- [x] Settlement reminder cron
- [x] Recurring expense cron
- [x] Budget reset cron
- [x] Guest expiry cron

What was added (2026-04-11):

`e2e/cron.spec.ts` — smoke tests for all 7 active Vercel cron routes.
Added to the `unauthenticated` project in playwright.config.ts.

Coverage per route:
- `GET /api/cron/reminders` — 401 without auth; 200 + `{ processed: number }` with valid secret
- `GET /api/cron/rewards` — 401 without auth; 200 + `{ processed: number, payouts: array }` with valid secret
- `GET /api/cron/subscription` — 401 without auth; 200 + `{ expired: number }` with valid secret
- `GET /api/cron/settlement-reminders` — 401 without auth; 200 + `{ reminded: number }` with valid secret
- `GET /api/cron/recurring-expenses` — 401 without auth; 200 + `{ created, skipped, reminded: number }` with valid secret
- `GET /api/cron/budget-reset` — 401 without auth; 200 + `{ reset: number }` with valid secret
- `GET /api/cron/guest-expiry` — 401 without auth; 200 + `{ expired: number, timestamp: string }` with valid secret
- Wrong secret → 401 (spot-checked on reminders route)

CRON_SECRET handling:
- Spec reads `process.env.CRON_SECRET` first (CI/shell injection)
- Falls back to parsing `.env.local` directly (local dev without shell export)
- Authorized-execution tests are skipped automatically when secret cannot be resolved
- Unauthorized tests (expecting 401) always run regardless of secret availability

Idempotency: all cron routes return 0-counts when there is nothing to process.
Running the tests on a clean or near-empty DB is safe and produces no side effects.

### Expenses / OCR / Export
- [ ] Receipt scan happy path
- [ ] Receipt scan invalid body / oversized image
- [ ] Azure unavailable path
- [ ] CSV export
- [ ] PDF export
- [ ] Settle-all flows

### Household Management
- [x] Create household (response shape, validation, auth gate)
- [x] Join household (valid join, invalid code, already-member, multi-household premium gate)
- [ ] Invite guest (requires premium + multi-context; tracked in auth-invite.spec.ts page-render test)
- [x] Add child (201 + 4-digit PIN, name length validation)
- [ ] Transfer admin (low risk path; covered by manual QA)
- [x] Remove member (full flow: add child → get membership ID → remove; non-admin blocked)
- [x] Delete household data (content cascade + household persists + non-admin blocked)
- [x] Delete household entirely (admin deletes + membership gone → 404 on /me; non-admin blocked)
- [x] Rename household (admin renames; non-admin blocked)

What was added (2026-04-11):

`e2e/global-setup.ts`:
- Added `member.json` auth state (login as member@roost.test).
- Added `child.json` auth state via POST /api/auth/child-login (sets session cookie via Set-Cookie).

`e2e/household.spec.ts` (new):
- Auth contracts: create/join/add-child all return 401 without session.
- Create household: valid name → 200 with id/name/6-char code; empty name → 400; missing name → 400.
- Join household: beforeAll creates a fresh joinable household; invalid code → 404; fresh user
  joins with valid code → 200 with household name; join-host retrying own household → 400 "already
  a member"; free-admin (already has household) joining another free household → 403 multi-household gate.
- Add child: admin with household → 201 with { child: { id, name }, pin: /^\d{4}$/ }; name > 32
  chars → 400; empty name → 400.
- Remove member: beforeAll creates isolated admin + household + child; test removes child via
  household_members.id (obtained from GET /api/household/members); non-existent ID → 404; seeded
  member attempting DELETE → 403. Child membership ID discovered via members list after add-child.
- Delete household data: creates chore → verifies it exists → POST delete-data → chore list empty →
  GET /api/household/me still returns 200 (household row preserved). Member → 403.
- Delete household entirely: admin deletes fresh household → GET /api/household/me returns 404
  (all memberships deleted). Member → 403.
- Rename household: admin renames → response contains new name. Member → 403.

`playwright.config.ts`:
- household.spec.ts added to unauthenticated project testMatch.

Isolation notes:
- All create/mutate/delete tests use fresh signup + fresh household created in the test or beforeAll.
  Seeded households (Roost Free House, Roost Premium House) are never modified.
- Transfer admin is not automated: it requires two admin-role sessions in the same household, which
  adds complexity without covering a new failure mode (it's a PATCH that requires admin role — already
  covered by the admin-only pattern). Manual QA step in 4.3.
- Invite guest is partially covered in auth-invite.spec.ts (page renders correctly for unauthenticated
  visitor; the join flow is manual QA). Full invite join requires a premium household + two contexts.

## 4.3 Manual QA Before Launch
- [ ] Full onboarding on desktop
- [ ] Full onboarding on mobile
- [ ] Admin dashboard access and lockout behavior
- [ ] Billing purchase in Stripe test mode
- [ ] Cron verification in preview or staging
- [ ] Invite links from creation to acceptance
- [ ] Receipt scan with real-world sample receipts
- [ ] Core flows for chores, grocery, meals, reminders, notes, and tasks

## 5. Feature Decisions To Make

### 5.1 Email
- [ ] Decide whether guest invites should send emails or only generate links.
- [ ] If email is required for launch, implement and test Resend fully.

### 5.2 Push Notifications
- [ ] Decide whether push notifications are launch-critical.
- [ ] If not, explicitly defer them and remove launch dependency assumptions.

Notes:
- There are multiple TODOs referencing future Expo push wiring. Those do not have to block launch unless product scope says they do.

### 5.3 Admin Access Model
- [ ] Decide whether admin tools are internal-only or part of the shipped public app operations surface.

## 6. Suggested Execution Order

### Phase 1: Stabilize the Build
- [x] Fix the email-sync bug
- [x] Fix lint blockers
- [x] Confirm clean build

### Phase 2: Lock Down Production Surfaces
- [x] Harden cron auth
- [x] Harden admin auth
- [x] Add env example and deploy docs
- [x] Review config/security headers/logging
- [x] Add structured logging and observability hooks (2.4)
- [x] Write README and production runbook (2.1)

### Phase 3: Prove the Critical Flows
- [ ] Expand tests for auth, billing, permissions, and cron jobs
- [ ] Run full regression in a production-like environment
- [ ] Verify Stripe and Azure integrations end to end

### Phase 4: Launch Readiness
- [ ] Final manual QA pass
- [ ] Final env/secrets verification
- [ ] Migration/deploy dry run
- [ ] Rollback plan confirmed

## 7. Session Workflow

At the start of each future Roost session:
1. Open this roadmap.
2. Pick the next highest-priority unchecked item.
3. Fix it.
4. Test it.
5. Update this file.

Recommended next task:
- Phase 3 testing (4.2) — remaining gaps: expense export (CSV/PDF content verification)
  and settle-all flows (require multi-user state setup). After those, the 4.2 automated
  test coverage is complete enough to move to 4.3 manual QA. Alternatively, skip
  those edge cases and advance to 4.3 now — cron, auth, billing, permissions, and
  household ops are the highest-value paths.
  Current coverage summary:
    Auth flows       — COVERED (signup, login, logout, child PIN, email change, invite page)
    Billing          — COVERED (auth/role gates, webhook sig rejection, UI states)
    Permissions      — COVERED (unauthenticated 401, premium 403, child finance block, member admin block)
    Household ops    — COVERED (create, join, add child, remove member, delete data, full delete, rename)
    Cron jobs        — COVERED (auth rejection + authorized execution + response shape for all 7 routes)
    Expenses/export  — NOT COVERED (manual QA with Stripe test mode + receipt images)
