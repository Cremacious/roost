# Performance and Cost Tracker

This file tracks app-level optimizations that reduce unnecessary Vercel
invocations, Neon query volume, storage growth, and runtime overhead.

Status legend:
- `[ ]` Not started
- `[-]` In progress
- `[x]` Done

## Current focus

- `[x]` 1. Remove global polling defaults
- `[x]` 2. Reduce or eliminate aggressive page-level polling
- `[x]` 3. Stop doing theme/session DB work in the root layout on every request
- `[x]` 4. Audit oversized API responses and add slimmer summary endpoints
- `[x]` 5. Review and add indexes for hot household/date-scoped queries
- `[x]` 6. Add retention/cleanup for operational tables
- `[x]` 7. Deduplicate repeated server-side lookups
- `[x]` 8. Review external fetches and non-critical polling

## Progress log

### 2026-04-14

- Started a focused optimization pass for Vercel and Neon cost control.
- Prioritized React Query polling first because it has the highest chance of
  creating background request volume across many open tabs.

## Item details

### 1. Remove global polling defaults

Goal:
- Keep a global `staleTime`.
- Remove the global `refetchInterval`.
- Make polling opt-in per query only when the UX truly benefits from it.

Why it matters:
- A shared global polling interval can silently make every query expensive.
- This increases Vercel function invocations and Neon query volume even when
  users are idle.

Work log:
- `2026-04-14`: Removed the global `refetchInterval` from the shared React
  Query client in `src/components/shared/QueryProvider.tsx`.
- `2026-04-14`: Kept a global `staleTime` and `refetchOnWindowFocus` so queries
  stay reasonably fresh without polling in the background.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.

### 2. Reduce or eliminate aggressive page-level polling

Goal:
- Replace most `10s` polling with mutation-driven invalidation, focus refetches,
  or slower intervals where freshness matters.

Work log:
- `2026-04-14`: Removed explicit `10s` polling from dashboard, calendar,
  chores, expenses, grocery, meals, notes, reminders, and tasks.
- `2026-04-14`: Removed the `reminders-due` `60s` polling loop from the shared
  reminder banner so due reminders no longer refresh in the background on every
  open tab.
- `2026-04-14`: Confirmed the only remaining explicit `refetchInterval` is the
  `5 minute` weather refresh in `TopBar`, which is deferred to item 8 because
  it is an external fetch rather than app data polling.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.

### 3. Stop doing theme/session DB work in the root layout on every request

Goal:
- Move expensive auth/theme reads out of the global layout path where possible.

Work log:
- `2026-04-14`: Removed the root layout's per-request `auth.api.getSession()`
  and user theme DB query from `src/app/layout.tsx`.
- `2026-04-14`: Kept auth protection intact by relying on the existing route
  enforcement in `src/proxy.ts`, which still redirects unauthenticated users
  away from protected app routes.
- `2026-04-14`: Updated `ThemeProvider` to persist the selected theme in
  `localStorage` and restore it client-side on future visits, while keeping the
  existing `/api/user/theme` write on theme changes.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.

### 4. Audit oversized API responses and add slimmer summary endpoints

Goal:
- Make dashboard and overview surfaces fetch only the data they render.

Work log:
- `2026-04-14`: Added `src/app/api/dashboard/summary/route.ts` so the
  dashboard can fetch a compact summary payload instead of fanning out to
  members, profile, expenses, reminders, meals, and activity endpoints.
- `2026-04-14`: Updated `src/app/(app)/dashboard/page.tsx` to use the compact
  dashboard summary route for welcome-state, premium state, balance, due
  reminders, tonight's meal, and recent activity.
- `2026-04-14`: Added `src/app/api/settings/billing/usage/route.ts` so the
  billing page can fetch lightweight usage counts instead of full chores,
  members, grocery lists, and reminders collections.
- `2026-04-14`: Updated `src/app/(app)/settings/billing/page.tsx` to use the
  compact billing usage route for free-tier usage bars.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.

### 5. Review and add indexes for hot household/date-scoped queries

Goal:
- Ensure the most frequent filtered and joined queries stay cheap as data grows.

Work log:
- `2026-04-14`: Added targeted indexes for household/date and membership lookup
  paths in `expenses`, `expense_splits`, `household_activity`, `reminders`,
  `meal_plan_slots`, `meals`, `chores`, `chore_completions`, `grocery_lists`,
  `grocery_items`, `tasks`, `household_members`, and `member_permissions`.
- `2026-04-14`: Added the incremental migration
  `drizzle/0003_perf_indexes.sql` so the index improvements can be applied
  safely without generating a full baseline schema migration.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.

### 6. Add retention/cleanup for operational tables

Goal:
- Prevent unbounded growth in rate-limit, activity, notification, and similar
  support tables.

Work log:
- `2026-04-14`: Added opportunistic expiry cleanup for `request_rate_limits`
  inside `src/lib/security/rateLimit.ts` so stale rows get pruned during normal
  traffic without depending entirely on a scheduler.
- `2026-04-14`: Added `src/app/api/cron/cleanup/route.ts` to prune expired
  rate-limit rows, old household activity, old sent notifications, and reminder
  receipts tied to completed or deleted reminders.
- `2026-04-14`: Added retention-supporting indexes for
  `request_rate_limits.reset_at` and `notification_queue(sent, sent_at)`.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.

### 7. Deduplicate repeated server-side lookups

Goal:
- Avoid repeated equivalent auth/user/theme/profile reads in the same request or
  render path.

Work log:
- `2026-04-14`: Added request-scoped session and current-membership memoization
  in `src/lib/auth/helpers.ts` using `WeakMap<Request, Promise<...>>`, so nested
  server helpers can reuse the same auth and household lookup within a request.
- `2026-04-14`: Updated the highest-traffic household summary routes
  (`/api/dashboard/summary`, `/api/settings/billing/usage`,
  `/api/household/me`, and `/api/household/members`) to use the shared
  request-scoped membership helper instead of each route re-implementing the
  same lookup path.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.

### 8. Review external fetches and non-critical polling

Goal:
- Keep weather, observability forwarding, and other secondary network traffic
  intentional and low-frequency.

Work log:
- `2026-04-14`: Updated `src/components/layout/TopBar.tsx` so the weather
  query no longer uses timer-based polling and instead relies on a `5 minute`
  `staleTime` without background refetches on a fixed interval.
- `2026-04-14`: Disabled weather refetch-on-focus in `TopBar` because the
  forecast chip is secondary UI and does not need to generate extra network
  traffic every time a user returns to the tab.
- `2026-04-14`: Combined first-time geolocation preference writes into a single
  `/api/user/preferences` request so location bootstrapping no longer performs
  two back-to-back server invocations.
- `2026-04-14`: Verified with targeted `eslint` and a full `npm run build`.
