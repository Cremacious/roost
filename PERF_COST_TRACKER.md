# Performance and Cost Tracker

This file tracks app-level optimizations that reduce unnecessary Vercel
invocations, Neon query volume, storage growth, and runtime overhead.

Status legend:
- `[ ]` Not started
- `[-]` In progress
- `[x]` Done

## Current focus

- `[x]` 1. Remove global polling defaults
- `[ ]` 2. Reduce or eliminate aggressive page-level polling
- `[ ]` 3. Stop doing theme/session DB work in the root layout on every request
- `[ ]` 4. Audit oversized API responses and add slimmer summary endpoints
- `[ ]` 5. Review and add indexes for hot household/date-scoped queries
- `[ ]` 6. Add retention/cleanup for operational tables
- `[ ]` 7. Deduplicate repeated server-side lookups
- `[ ]` 8. Review external fetches and non-critical polling

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

### 3. Stop doing theme/session DB work in the root layout on every request

Goal:
- Move expensive auth/theme reads out of the global layout path where possible.

### 4. Audit oversized API responses and add slimmer summary endpoints

Goal:
- Make dashboard and overview surfaces fetch only the data they render.

### 5. Review and add indexes for hot household/date-scoped queries

Goal:
- Ensure the most frequent filtered and joined queries stay cheap as data grows.

### 6. Add retention/cleanup for operational tables

Goal:
- Prevent unbounded growth in rate-limit, activity, notification, and similar
  support tables.

### 7. Deduplicate repeated server-side lookups

Goal:
- Avoid repeated equivalent auth/user/theme/profile reads in the same request or
  render path.

### 8. Review external fetches and non-critical polling

Goal:
- Keep weather, observability forwarding, and other secondary network traffic
  intentional and low-frequency.
