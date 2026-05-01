# Codebase Concerns

**Analysis Date:** 2026-05-01

---

## Tech Debt

**getUserHousehold exported from a feature route:**
- Issue: `getUserHousehold()` and `calcNextDueAt()` are defined in `src/app/api/chores/route.ts` and imported by 67 other route files across calendar, expenses, meals, tasks, reminders, notes, grocery, and admin routes.
- Files: `src/app/api/chores/route.ts` (source), all 67 importing routes
- Impact: Any change to the chores route file risks breaking unrelated API routes. Conceptual coupling between a feature handler and a shared utility is a maintenance hazard.
- Fix approach: Move `getUserHousehold` and `calcNextDueAt` to `src/lib/utils/household.ts` or `src/lib/auth/helpers.ts` and update all 67 import sites.

**Orphaned legacy allowances system:**
- Issue: Two superseded tables (`allowance_settings`, `allowance_payouts`) remain in the schema and are actively imported by `src/app/api/cron/allowances/route.ts` and `src/app/api/household/members/[id]/allowance/route.ts`. The cron file is NOT listed in `vercel.json` and is never invoked. The new rewards system (`reward_rules`, `reward_payouts`) replaced this.
- Files: `src/db/schema/allowances.ts`, `src/app/api/cron/allowances/route.ts`, `src/app/api/household/members/[id]/allowance/route.ts`
- Impact: Dead code that misleads future developers; schema tables that should not be migrated forward or preserved unnecessarily.
- Fix approach: Delete `src/app/api/cron/allowances/route.ts`, remove `allowance/route.ts` API endpoint (or confirm it is also unused), then mark the legacy tables in `allowances.ts` as deprecated with a comment. The `allowance_settings` and `allowance_payouts` tables themselves can be dropped post-launch once confirmed nothing reads them.

**Legacy `category` text field on expenses:**
- Issue: `expenses.category` is a plain-text column kept for backwards compatibility while the new `expenses.category_id` FK to `expense_categories` is the current system. A state variable tagged `// legacy` still exists in `src/components/expenses/ExpenseSheet.tsx:190`.
- Files: `src/db/schema/expenses.ts`, `src/components/expenses/ExpenseSheet.tsx`
- Impact: Schema confusion; any query that reads `category` instead of joining `category_id` gets stale or empty data for new expenses.
- Fix approach: Migrate old data, drop the text column, remove the legacy state in ExpenseSheet.

**Cleanup cron not scheduled:**
- Issue: `src/app/api/cron/cleanup/route.ts` exists (prunes rate-limit rows, old activity, sent notifications, reminder receipts) but is absent from `vercel.json`. It is never invoked automatically.
- Files: `src/app/api/cron/cleanup/route.ts`, `vercel.json`
- Impact: Operational tables (`request_rate_limits`, `household_activity`, `notification_queue`, `reminder_receipts`) grow unbounded.
- Fix approach: Add `{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }` to `vercel.json`.

**`db:push` is the only migration path; no migration journal baseline:**
- Issue: `drizzle/` contains hand-written SQL files (`0001_suggested_meals.sql`, `0002_request_rate_limits.sql`, `0003_perf_indexes.sql`) but no `meta/_journal.json` snapshot anchor. `drizzle-kit migrate` cannot be safely used. The sole deploy migration path is `npm run db:push`, which is non-destructive but manual and undocumented in CI.
- Files: `drizzle.config.ts`, `drizzle/` directory
- Impact: No automated schema migration in CI. A schema change deployed without a matching `db:push` will produce runtime column-not-found errors. Manual QA is required to confirm schema is in sync before each deploy.
- Fix approach: Add a post-deploy step in CI or Vercel build hooks to run `db:push`. Long-term: generate a Drizzle journal baseline and switch to `db:migrate`.

**Name field de-sync between `user` and `users` tables:**
- Issue: The `name` field exists in both the better-auth `user` table and the app `users` table. Only the auth hook syncs name on account creation. Name changes via `PATCH /api/user/profile` update only the app `users` table.
- Files: `src/app/api/user/profile/route.ts`, `src/db/schema/auth.ts`, `src/db/schema/users.ts`
- Impact: After a user changes their display name, the better-auth `user` table retains the original name. Any surface that reads from the auth table directly will show a stale name.
- Fix approach: When `name` is updated in `PATCH /api/user/profile`, also update `authUserTable.name` in the same write, mirroring the email sync pattern.

**No database transactions for multi-table writes (Neon HTTP driver limitation):**
- Issue: The Neon HTTP driver does not support transactions. Multi-table writes (profile email update, household delete cascade, child account creation, onboarding completion) are sequential `await db.*` calls with manual rollback where possible.
- Files: `src/app/api/user/profile/route.ts:120`, `src/app/api/household/[id]/route.ts:64-159`, `src/app/api/household/members/add-child/route.ts`
- Impact: Partial writes are possible if a server crashes mid-sequence. The household delete cascade (15+ sequential deletes) is especially vulnerable — an interruption leaves orphaned rows. The profile email rollback is best-effort only.
- Fix approach: Switch to `@neondatabase/serverless` with WebSocket transport for transaction support, or use Neon's REST batch API for atomic multi-statement operations.

**66 outstanding ESLint warnings:**
- Issue: `npm run lint` passes with 66 warnings (mostly `@typescript-eslint/no-unused-vars` and `react-hooks/exhaustive-deps`). Documented in `PRODUCTION_ROADMAP.md:76`.
- Files: spread across multiple sheet components and hooks
- Impact: Warnings noise can hide real rule violations introduced later. `exhaustive-deps` violations can cause stale closure bugs.
- Fix approach: Triage in a focused lint pass: fix or explicitly disable each warning with a comment explaining why.

---

## Known Bugs

**Email update is not atomic (Neon HTTP driver):**
- Symptoms: If the `users` table write succeeds but an error is thrown after the `authUserTable` write, the manual rollback may silently fail (`.catch(() => undefined)`). User ends up with mismatched emails.
- Files: `src/app/api/user/profile/route.ts:120-152`
- Trigger: Transient DB error or unique constraint race between pre-check and write.
- Workaround: The rollback is best-effort. Manual DB correction needed if it fires.

**`favicon-16x16.png` and `favicon-32x32.png` referenced but missing:**
- Symptoms: `src/app/layout.tsx` metadata block declares both sizes, but only `favicon-96x96.png` and `favicon.ico` exist in `public/`.
- Files: `src/app/layout.tsx:44-47`, `public/`
- Trigger: Any browser that requests the declared icon sizes will get a 404.
- Workaround: Remove the 16x16 and 32x32 entries from the `icons` metadata array, or add the missing files.

---

## Security Considerations

**CSP uses `'unsafe-inline'` in `script-src` (production):**
- Risk: The Content Security Policy allows inline scripts on all pages in production. This weakens XSS protection for the Tiptap editor, Recharts, and any future third-party script injection.
- Files: `src/lib/security/csp.ts:28`
- Current mitigation: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `frame-ancestors 'none'` are set. The `'unsafe-inline'` is required by Next.js inline script tags and Recharts.
- Recommendations: Implement nonce-based CSP using Next.js middleware to generate per-request nonces. This allows removing `'unsafe-inline'` while keeping inline Next.js scripts working.

**Admin panel is publicly reachable with no IP allowlist by default:**
- Risk: `ADMIN_ALLOWED_IPS` is optional (commented out in `.env.example`). If not configured, `isAdminIpAllowed()` returns `true` for all IPs. The admin panel at `/admin` is reachable from any network.
- Files: `src/lib/security/request.ts:57-62`, `src/proxy.ts:30`
- Current mitigation: Per-IP in-memory rate limiting (5 attempts / 15 min) on the login endpoint. JWT session expires after 8 hours.
- Recommendations: Configure `ADMIN_ALLOWED_IPS` in production Vercel environment to restrict admin access to known IPs or a VPN egress range. Document this as a required step in the deploy checklist.

**Admin rate limiter is per-serverless-instance:**
- Risk: Vercel spins up multiple instances. A distributed brute-force attack sourcing from many IPs (or using Vercel's per-instance isolation) can bypass the 5-attempt / 15-minute in-memory limiter.
- Files: `src/app/api/admin/login/route.ts`
- Current mitigation: Strong env-var credentials, per-instance rate limit accepted for launch.
- Recommendations: Post-launch, move rate-limit state to `request_rate_limits` DB table (already used for OCR scans) to get cross-instance protection. Same pattern as `consumeRateLimit()` in `src/lib/security/rateLimit.ts`.

**Child login PIN brute-force rate limiter is also per-instance:**
- Risk: A 4-digit PIN has only 10,000 values. The `GET /api/auth/child-login` endpoint is public and returns all child IDs for a given household code. An attacker with the 6-character household code can enumerate children then iterate PINs across Vercel instances.
- Files: `src/app/api/auth/child-login/route.ts`
- Current mitigation: Per-IP in-memory limiter (5 attempts / 15 min) added per `PRODUCTION_ROADMAP.md`.
- Recommendations: Migrate the PIN rate limiter to the DB-backed `consumeRateLimit()` for cross-instance enforcement.

**PII potentially logged in admin auth flows:**
- Risk: `LAUNCH_CHECKLIST.md` flags: "Stop logging PII in auth flows. Admin login logs email addresses on success/failure." This has not been confirmed resolved in code.
- Files: `src/app/api/admin/login/route.ts`
- Current mitigation: Structured logger (`src/lib/utils/logger.ts`) is in place with documented guidance to avoid PII. Whether the admin login route was updated is unverified.
- Recommendations: Audit `console.warn`/`console.info` calls in `src/app/api/admin/login/route.ts` to confirm email is not logged; replace with hashed or omitted identifier.

---

## Performance Bottlenecks

**Stats route runs 22 parallel SQL queries:**
- Problem: `GET /api/stats` issues 22 queries via `Promise.all` for a single page load. On Neon free tier (single shared instance, connection pool limited), this can exhaust the connection pool or cause significant latency under concurrent users.
- Files: `src/app/api/stats/route.ts`
- Cause: Each chart/stat is a separate aggregation query; no caching layer.
- Improvement path: Cache stats responses for 5 minutes with a timestamp-keyed key in the DB or localStorage, since stats page data does not need real-time accuracy.

**Dashboard summary API is still a multi-query fan-out:**
- Problem: `src/app/api/dashboard/summary/route.ts` was created as a compact endpoint, but still runs several parallel queries per page load for every user visiting the dashboard.
- Files: `src/app/api/dashboard/summary/route.ts`
- Cause: Per-request DB queries with no caching for frequently-visited dashboard data.
- Improvement path: Add a short `staleTime` (30s) on the dashboard query and consider a materialized summary row per household updated on mutation.

**Grocery smart sort classifier is a pure keyword scan (O(n * keywords)):**
- Problem: `classifyItem()` in `src/lib/utils/grocerySort.ts` runs a case-insensitive keyword check for every store section on every item. With many items and sections this is acceptable, but it has no index and no caching of results.
- Files: `src/lib/utils/grocerySort.ts`
- Cause: Pure client-side, runs on every render when items change.
- Improvement path: Memoize classification results in a `Map<itemName, section>` keyed by normalized item name.

---

## Fragile Areas

**Household deletion cascade (15+ sequential awaits, no transaction):**
- Files: `src/app/api/household/[id]/route.ts:64-159`
- Why fragile: Each FK-ordered delete is a separate `await db.delete()`. A mid-sequence server timeout or Vercel cold-start leaves orphaned rows across reminders, chores, grocery lists, calendar events, expenses, meals, and activity tables. There is no retry or idempotency key.
- Safe modification: Any new schema table with a `household_id` FK must be added to the `deleteAllHouseholdData()` function in the correct FK order before deploying.
- Test coverage: Basic cascade tested in `e2e/household.spec.ts`. Partial-failure scenario has no test.

**Recurring calendar event expansion (memory-based, no pagination):**
- Files: `src/lib/utils/recurrence.ts`, `src/app/api/calendar/route.ts`
- Why fragile: `expandEventsForRange()` loads all recurring template rows from the DB and expands them in memory. A household with hundreds of recurring events and a long date range (e.g., the stats page querying 90 days) expands all instances in a single in-memory pass.
- Safe modification: Only query months that are actually needed; avoid passing unbounded date ranges to the calendar API.
- Test coverage: Unit tests for recurrence expansion exist in `src/lib/utils/recurrence.ts` tests (if any). No load test.

**Settings page is 3,373 lines in a single file:**
- Files: `src/app/(app)/settings/page.tsx`
- Why fragile: All settings sections (Profile, Appearance, Preferences, Household, Members, Notifications, Promotions, Billing, Danger Zone) are in one massive client component. Adding a section or modifying scrollspy logic risks breaking the others. Large re-renders affect all settings sections simultaneously.
- Safe modification: Add a new section by inserting it into the existing `SECTIONS` config array and matching the nav scroll anchors. Do not restructure the scrollspy logic without testing all existing nav links.
- Test coverage: No unit tests for the settings component. E2E covers individual PATCH calls but not the settings UI rendering.

**`getUserHousehold()` returns `null` for expired guest members:**
- Files: `src/lib/auth/helpers.ts`, `src/app/api/chores/route.ts`
- Why fragile: `requireHouseholdMember` throws 403 for expired guests. `getUserHousehold` returns `null`. Any route that uses `getUserHousehold` without checking for `null` before proceeding will produce a confusing 404 instead of a 403.
- Safe modification: Always null-check `getUserHousehold()` results before accessing `.householdId` or `.role`. Use `requireHouseholdMember` for routes that need explicit auth error handling.
- Test coverage: Covered in `e2e/permissions.spec.ts` for known endpoints.

---

## Scaling Limits

**Neon free tier: 0.5 GB storage:**
- Current capacity: 0.5 GB included, $0/month.
- Limit: Activity feed (`household_activity`), grocery items, and chore completions grow linearly per household. A household with active use can generate thousands of rows monthly. Soft-delete rows (deleted_at set, not purged for 30 days) add to this growth.
- Scaling path: The cleanup cron (currently unscheduled — see Tech Debt above) prunes operational tables. Once scheduled, growth is bounded. Upgrade to Neon paid tier ($19/month for 10 GB) when storage approaches 400 MB.

**Vercel hobby tier: 100 GB bandwidth, 100 serverless function invocations per day:**
- Current capacity: Free hobby tier.
- Limit: The reminders cron runs every 15 minutes (96 invocations/day), plus user traffic. Cron alone nearly saturates the daily invocation budget.
- Scaling path: Move to Vercel Pro ($20/month) before launch, which removes the daily invocation limit.

**In-memory rate limiter (admin/child-login) is per-Vercel-instance:**
- Current capacity: Effective only when attacker sources requests to the same serverless instance.
- Limit: Distributed attacks across instances bypass the limiter entirely.
- Scaling path: Switch to DB-backed `consumeRateLimit()` for admin login and child PIN endpoints (same pattern already used for receipt scanning).

---

## Dependencies at Risk

**`better-auth` is a relatively young library:**
- Risk: The project uses `better-auth` for all session management. The library does not have the long-term stability track record of NextAuth/Auth.js. Breaking API changes are possible.
- Impact: Auth, session cookies, and the child-login internalAdapter all depend on its internals.
- Migration plan: The auth layer is isolated in `src/lib/auth/`. If a major version break occurs, only `src/lib/auth/index.ts`, `src/lib/auth/client.ts`, and the catch-all API route need updates.

**`pdfkit` (PDF export) has no streaming/serverless guidance:**
- Risk: `pdfkit` is designed for Node.js streams. The export route wraps its `Buffer` output in `new Uint8Array()` to satisfy Vercel's edge-compatible `Response` constructor. This has been tested once but is an unusual integration pattern.
- Impact: PDF exports break if Vercel changes its `Response` handling or if `pdfkit` updates its Buffer API.
- Files: `src/app/api/expenses/export/route.ts`
- Migration plan: Switch to a serverless-native PDF library (e.g., `@react-pdf/renderer` or `jspdf`) if `pdfkit` causes issues.

---

## Missing Critical Features

**Push notifications not implemented:**
- Problem: 9 `TODO` comments across cron routes, category suggestion routes, and the RewardsWidget reference Expo push notifications. The `push_token` column exists on the `users` table and is accepted via `PATCH /api/user/profile`, but no route ever sends a push.
- Blocks: Reward notifications to children, reminder firing notifications, chore category approval notifications, settlement reminders.
- Files: `src/app/api/cron/reminders/route.ts:84`, `src/app/api/cron/rewards/route.ts:276`, `src/app/api/expenses/route.ts:416`, `src/components/shared/RewardsWidget.tsx:108`, `src/app/api/chore-categories/suggest/route.ts:63`, `src/app/api/expenses/categories/suggest/route.ts:54`

**Email (Resend) not implemented:**
- Problem: `src/lib/email/auth-emails.ts` imports Resend and has a `sendPasswordResetEmail()` function, but `RESEND_API_KEY` is documented as deferred. Password reset (`/forgot-password`) calls `/api/auth/request-password-reset` which is a better-auth built-in that requires a working email transport.
- Blocks: Password reset email delivery. Guest invite emails (invites are link-only today).
- Files: `src/lib/email/auth-emails.ts`, `src/app/(auth)/forgot-password/page.tsx`

**i18n not implemented despite UI placeholder:**
- Problem: Settings > Preferences has a language selector that shows "Spanish translation coming soon." toast on selection. No translation keys, no `next-intl`, no Spanish strings exist.
- Blocks: Spanish localization launch.
- Files: `src/app/(app)/settings/page.tsx:2062`

---

## Test Coverage Gaps

**Stripe lifecycle not automated:**
- What's not tested: Checkout completion, subscription cancellation, reactivation, renewal, payment failure. These require live Stripe test mode events.
- Files: `src/app/api/stripe/webhook/route.ts`, `src/app/api/stripe/checkout/route.ts`
- Risk: A broken webhook handler silently fails to upgrade a paying customer to premium.
- Priority: High. Manual QA via `stripe listen` CLI is required before launch.

**Receipt scanning (OCR) has no automated tests:**
- What's not tested: Happy path scan, oversized image rejection, Azure unavailable/503 path, empty scan result (0 items).
- Files: `src/app/api/expenses/scan/route.ts`, `src/lib/utils/azureReceipts.ts`
- Risk: An Azure API change or misconfigured credentials silently fails for premium users.
- Priority: High. Add at minimum a unit test for `parseReceiptImage` with a mocked Azure client.

**Expense settle-all flows have no automated tests:**
- What's not tested: Claim, confirm, dispute, cancel, remind flows. The two-sided settlement state machine has 5 endpoints and 3 state flags (`settled_by_payer`, `settled_by_payee`, `settlement_disputed`).
- Files: `src/app/api/expenses/settle-all/claim/route.ts`, `confirm/route.ts`, `dispute/route.ts`, `cancel/route.ts`, `remind/route.ts`
- Risk: A regression in the settlement flow could leave expenses in an inconsistent settled state.
- Priority: High post-launch.

**Guest invite join flow has no end-to-end test:**
- What's not tested: Full multi-user invite join (premium admin creates invite, different user accepts, lands as guest member).
- Files: `src/app/api/invite/[token]/route.ts`, `src/app/invite/[token]/page.tsx`
- Risk: Guest join silently fails on a production deploy if the invite token validation or session creation has a bug.
- Priority: Medium. The page-render test exists; full join is manual QA.

**CSV and PDF export not automated:**
- What's not tested: File download content, date range filtering, PDF rendering correctness.
- Files: `src/app/api/expenses/export/route.ts`, `src/app/api/expenses/export/preview/route.ts`
- Risk: Export silently returns empty or malformed files.
- Priority: Medium post-launch.

---

## Operational Gaps

**No error tracking provider (Sentry or equivalent):**
- Problem: `ObservabilityProvider.tsx` posts page views and errors to `/api/observability/events`, and `logger.ts` is structured to be swapped for a real provider. Neither Sentry nor any equivalent SDK is installed. Client-side uncaught exceptions and React error boundary captures go nowhere.
- Files: `src/components/providers/ObservabilityProvider.tsx`, `src/lib/utils/logger.ts`
- Risk: Production errors are invisible until a user reports them or someone manually searches Vercel function logs.
- Fix approach: Install `@sentry/nextjs`. The logger.ts swap pattern means server-side integration is a one-file change.

**First production deployment not verified:**
- Problem: All required environment variables have not been confirmed set in Vercel. The Stripe webhook has not been registered against a production URL. Azure Document Intelligence endpoint has not been live-tested.
- Blocks: Billing, receipt scanning, and Stripe webhooks are all unverified in production.
- Fix: Follow `RUNBOOK.md` first-deploy checklist before launch.

---

*Concerns audit: 2026-05-01*
