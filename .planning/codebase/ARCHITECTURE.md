<!-- refreshed: 2026-05-01 -->
# Architecture

**Analysis Date:** 2026-05-01

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         Public Routes                                │
│   src/app/page.tsx (marketing)   src/app/invite/[token]/page.tsx     │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                     Middleware (src/proxy.ts)                         │
│   Auth check · Onboarding guard · Admin IP filter · x-pathname header│
└──────┬──────────────────┬───────────────────────────┬────────────────┘
       │                  │                           │
       ▼                  ▼                           ▼
┌────────────┐  ┌──────────────────┐       ┌──────────────────────────┐
│ (auth)     │  │ (app)            │       │ (admin)                  │
│ /login     │  │ /dashboard       │       │ /admin                   │
│ /signup    │  │ /chores          │       │ /admin/users             │
│ /child-    │  │ /grocery         │       │ /admin/households        │
│  login     │  │ /calendar        │       │ /admin/promo-codes       │
│            │  │ /expenses        │       │                          │
│ No shell   │  │ /tasks /notes    │       │ Separate jose JWT auth   │
│            │  │ /meals /reminders│       │ Indigo (#6366F1) branding│
└────────────┘  │ /stats /settings │       └──────────────────────────┘
                │                  │
                │ AppShell wraps all│
                │ Sidebar + TopBar +│
                │ BottomNav         │
                └──────┬───────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────────┐
│                          API Routes (src/app/api/)                    │
│   Auth guard via requireSession / requireHouseholdMember helpers      │
│   Premium gate via requirePremium / FREE_TIER_LIMITS constants        │
│   Drizzle ORM queries → Neon PostgreSQL                               │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────────┐
│              Database Layer (Neon PostgreSQL via Drizzle)             │
│          src/lib/db/index.ts   src/db/schema/index.ts                │
│   21 domain schema files · soft deletes · household_activity log      │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Middleware (proxy) | Auth redirect, onboarding guard, admin IP filter, pathname header | `src/proxy.ts` |
| Root Layout | Font loading, ThemeProvider, Toaster, metadata | `src/app/layout.tsx` |
| App Layout | QueryProvider, AppShell | `src/app/(app)/layout.tsx` |
| Admin Layout | Jose JWT verify, admin nav shell | `src/app/(admin)/layout.tsx` |
| AppShell | Sidebar + TopBar + BottomNav + ReminderBanner; hides nav on /onboarding | `src/components/layout/AppShell.tsx` |
| Auth helpers | getSession (WeakMap cache), requireSession, requireHouseholdMember, requirePremium, blockChild | `src/lib/auth/helpers.ts` |
| better-auth config | Email/password + Google OAuth, databaseHook mirrors to app users table | `src/lib/auth/index.ts` |
| DB client | Neon serverless + Drizzle instance | `src/lib/db/index.ts` |
| Schema index | Re-exports all 21 domain schema files | `src/db/schema/index.ts` |
| useHousehold | Client-side household/role/permissions/isPremium hook | `src/lib/hooks/useHousehold.ts` |
| ThemeProvider | CSS variable injection on mount, applyTheme export, useTheme hook | `src/components/providers/ThemeProvider.tsx` |
| logActivity | Fire-and-forget activity insert, never throws | `src/lib/utils/activity.ts` |
| premiumGating | Server-side limit checkers for all resource types | `src/lib/utils/premiumGating.ts` |

## Pattern Overview

**Overall:** Full-stack Next.js App Router with route-group isolation for app shell, auth, and admin. Client components use TanStack Query for server state. Zero server components inside the app shell (all `"use client"`). API routes are thin HTTP handlers that delegate auth to helper functions then run Drizzle queries.

**Key Characteristics:**
- Route groups `(app)`, `(auth)`, `(admin)` isolate layouts and metadata
- API routes handle their own auth — middleware skips `/api/*` entirely
- Two separate auth systems: better-auth (app users) and jose JWT (admin panel)
- Premium status is a single source of truth: `households.subscription_status` column
- Soft deletes on all major tables; Vercel cron purges `deleted_at > 30 days`

## Layers

**Middleware Layer:**
- Purpose: Route protection, redirect orchestration, pathname header injection
- Location: `src/proxy.ts`
- Contains: Auth redirect, onboarding guard, admin IP allowlist check
- Depends on: `getSession` from `src/lib/auth/helpers.ts`
- Used by: All non-API, non-static routes

**Page Layer:**
- Purpose: User-facing UI, client components, TanStack Query data fetching
- Location: `src/app/(app)/`, `src/app/(auth)/`, `src/app/(admin)/`
- Contains: "use client" page components, feature-level state, mutation hooks
- Depends on: API routes (via fetch), shared components, hooks
- Used by: End users via browser

**API Route Layer:**
- Purpose: HTTP endpoint handlers; auth, validation, DB writes, premium checks
- Location: `src/app/api/`
- Contains: GET/POST/PATCH/DELETE handlers in `route.ts` files
- Depends on: `src/lib/auth/helpers.ts`, `src/lib/db/`, `src/db/schema/`, `src/lib/utils/`
- Used by: Page layer (via TanStack Query fetches), Vercel cron jobs

**Service Utilities Layer:**
- Purpose: Shared logic with zero DOM dependencies; safe to call from any server context
- Location: `src/lib/utils/`
- Contains: `activity.ts`, `premiumGating.ts`, `recurrence.ts`, `debtSimplification.ts`, `grocerySort.ts`, `azureReceipts.ts`, `stripe.ts`, `time.ts`, etc.
- Depends on: `src/lib/db/`, `src/db/schema/`
- Used by: API routes, cron jobs

**Constants Layer:**
- Purpose: App-wide config, limits, theme definitions, gate config
- Location: `src/lib/constants/`
- Contains: `colors.ts`, `themes.ts`, `freeTierLimits.ts`, `premiumGateConfig.ts`
- Depends on: Nothing
- Used by: API routes (limits), client components (colors, themes)

**Schema Layer:**
- Purpose: Drizzle table definitions and type exports
- Location: `src/db/schema/` (21 files) + `src/db/schema/index.ts`
- Contains: One file per domain (chores, expenses, calendar, etc.)
- Depends on: Drizzle ORM
- Used by: `src/lib/db/index.ts`, all API routes

**Shared Component Layer:**
- Purpose: Reusable UI primitives used across features
- Location: `src/components/shared/`, `src/components/ui/` (shadcn), `src/components/layout/`
- Contains: SlabCard, EmptyState, PremiumGate, DraggableSheet, MemberAvatar, PageHeader, etc.
- Depends on: CSS variables, constants, hooks
- Used by: All feature pages and sheets

## Data Flow

### Primary Request Path (authenticated page load)

1. Browser navigates to `/chores` — middleware in `src/proxy.ts` checks session via `getSession()`
2. If no session, redirect to `/login?callbackUrl=/chores`
3. If session but `onboarding_completed=false`, redirect to `/onboarding`
4. Page renders inside App Layout: `src/app/(app)/layout.tsx` → `AppShell` + `QueryProvider`
5. `src/app/(app)/chores/page.tsx` (client component) — TanStack Query calls `GET /api/chores`
6. `src/app/api/chores/route.ts` — `requireSession()` → `getUserHousehold()` → Drizzle query → Response.json
7. Page renders with data, mutations (complete/uncheck) use optimistic updates with TanStack Query

### Mutation Flow (optimistic update pattern)

1. User taps "Complete chore" in `src/app/(app)/chores/page.tsx`
2. `useMutation` runs: `cancelQueries` → `setQueryData` (optimistic) → POST to API
3. API: `requireHouseholdMember()` → DB write → `logActivity()` (fire-and-forget)
4. `onError`: revert `setQueryData` to previous value
5. `onSettled`: `invalidateQueries` to sync with server truth

### Premium Gate Flow

1. User triggers premium-gated action (e.g. recurring chore) in client component
2. API returns 403 with `{ error, code: "RECURRING_CHORES_PREMIUM", limit, current }`
3. Client catches: `const err = new Error(msg); err.code = data.code; throw err`
4. Sheet `onError`: checks `err.code`, calls `onUpgradeRequired(err.code)` if present
5. Page sets `upgradeCode` state → renders `<PremiumGate feature="chores" trigger="sheet" />`
6. PremiumGate reads config from `src/lib/constants/premiumGateConfig.ts` (13 entries)

### Cron Job Flow

1. Vercel invokes `GET /api/cron/[name]` on schedule (see `vercel.json`)
2. Route validates `Authorization: Bearer CRON_SECRET` header
3. Runs DB queries: evaluate conditions, insert/update records, call `logActivity()`
4. Returns `Response.json({ processed: N })`

**State Management:**
- Server state: TanStack Query (default staleTime 10s, refetchOnWindowFocus true)
- Theme state: Zustand store (`src/lib/store/themeStore.ts`) + CSS variables applied by `ThemeProvider`
- No global UI state store; component-local `useState` for all interactive state

## Key Abstractions

**requireHouseholdMember / requireHouseholdAdmin / requirePremium:**
- Purpose: Server-side auth + authorization + premium gate in API routes
- Examples: Used in every protected API route
- Pattern: Async functions that throw `Response` objects on failure (caught by `try/catch res as Response`)
- File: `src/lib/auth/helpers.ts`

**getUserHousehold:**
- Purpose: Resolve the current user's household ID and role (most recently joined)
- Examples: Used in chores, grocery, expenses, tasks, notes, meals, calendar API routes
- Pattern: Exported from `src/app/api/chores/route.ts`, imported by other route files
- File: `src/app/api/chores/route.ts` (lines 12-32)

**logActivity:**
- Purpose: Write to `household_activity` table; fire-and-forget, never throws
- Pattern: Called after every successful write mutation in API routes
- File: `src/lib/utils/activity.ts`

**PremiumGate:**
- Purpose: Unified premium upgrade UI, driven by `PREMIUM_GATE_CONFIG`
- Variants: `trigger="sheet"` (drawer), `trigger="inline"` (embedded), `trigger="page"` (full-page)
- File: `src/components/shared/PremiumGate.tsx`, config at `src/lib/constants/premiumGateConfig.ts`

**DraggableSheet:**
- Purpose: All content bottom sheets in the app; wraps shadcn Sheet with drag-to-dismiss
- Pattern: `<DraggableSheet open={open} onOpenChange={...} featureColor={COLOR}>...</DraggableSheet>`
- File: `src/components/shared/DraggableSheet.tsx`

**SlabCard:**
- Purpose: Base card with rounded-2xl + 1.5px border + 4px bottom border (3D clay effect)
- Pattern: Used for all interactive cards, tiles, and list items
- File: `src/components/shared/SlabCard.tsx`

## Entry Points

**Marketing Homepage:**
- Location: `src/app/page.tsx`
- Triggers: Direct URL `/`
- Responsibilities: Public landing page, server component, no app shell

**App Shell:**
- Location: `src/app/(app)/layout.tsx` → `src/components/layout/AppShell.tsx`
- Triggers: Any authenticated `/(app)/*` route
- Responsibilities: Sidebar (desktop) + TopBar + BottomNav (mobile) + ReminderBanner

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page
- Responsibilities: Font injection, ThemeProvider (server-side initial theme = DEFAULT_THEME), Toaster, metadata

**Admin Shell:**
- Location: `src/app/(admin)/layout.tsx`
- Triggers: Any `/admin/*` route (after IP allowlist check in proxy)
- Responsibilities: Jose JWT verification, dark admin nav

**Public Invite Landing:**
- Location: `src/app/invite/[token]/page.tsx`
- Triggers: Guest invite link (bypasses auth middleware)
- Responsibilities: Token validation, household preview, join/signup CTAs

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. No worker threads. All DB calls are async/await via Neon serverless HTTP.
- **Global state:** `src/lib/db/index.ts` exports a singleton `db` instance. `src/lib/auth/index.ts` exports a singleton `auth` instance. `src/lib/store/themeStore.ts` is a module-level Zustand store.
- **Session cache:** `sessionCache` and `membershipCache` are WeakMap per-Request in `src/lib/auth/helpers.ts` — safe per-request, not cross-request.
- **Admin auth separation:** Admin panel uses a completely separate jose JWT system (`src/lib/admin/auth.ts`) with its own cookie. Not connected to better-auth sessions.
- **Schema location:** All Drizzle schemas live under `src/db/schema/` (not `src/lib/`). The `db` instance imports `* as schema` so all tables are typed.
- **No migration files:** Schema changes are applied via `npm run db:push` (Drizzle push). No migration history tracked in repo.
- **Cron secret:** All cron routes validate `Authorization: Bearer CRON_SECRET` env var. Routes return 401 without it.

## Anti-Patterns

### Importing getUserHousehold from the chores route

**What happens:** `getUserHousehold` is defined and exported from `src/app/api/chores/route.ts` and imported by other API routes (e.g. `src/app/api/expenses/route.ts`).
**Why it's wrong:** Creates a cross-route dependency that couples the expenses module to the chores module at the file level.
**Do this instead:** Move `getUserHousehold` to `src/lib/auth/helpers.ts` (alongside `requireCurrentMembership`) or `src/lib/utils/household.ts` so it has no feature-domain owner.

### Hardcoded hex values in component files

**What happens:** Occasional hardcoded `#EF4444`, `#3B82F6`, etc. appear in component files instead of importing from `src/lib/constants/colors.ts`.
**Why it's wrong:** Section color changes require finding every hardcoded instance; easy to miss one.
**Do this instead:** Always import from `src/lib/constants/colors.ts`. Use `SECTION_COLORS['chores']` not `'#EF4444'`.

## Error Handling

**Strategy:** API routes use `try/catch` where auth helpers throw `Response` objects. All helpers throw typed Response objects (not raw Errors) so routes can `return res as Response` cleanly.

**Patterns:**
- Auth failures: Helpers throw `new Response("Unauthorized", { status: 401 })` or `Response.json({...}, { status: 403 })`
- API route pattern: `try { authContext = await requireSession(request); } catch (res) { return res as Response; }`
- Client mutations: `onError` receives Error with optional `.code` string for premium gate routing
- `logActivity()` wraps its DB insert in try/catch and silently swallows errors — never propagates to caller
- Toast errors always include a description: `toast.error("Title", { description: "..." })`

## Cross-Cutting Concerns

**Logging:** `src/lib/utils/logger.ts` — `log.error()`, `log.info()` etc. Used in auth hooks and critical paths. Production logs go to Vercel's log drain.
**Validation:** Input validation done inline in API route handlers before DB writes. No shared validation schema library (no Zod).
**Authentication:** better-auth for app users (`src/lib/auth/`); jose JWT for admin panel (`src/lib/admin/auth.ts`). Child accounts use PIN-based login via `/api/auth/child-login`.
**Premium enforcement:** Server-side via `requirePremium()` + `checkXxxLimit()` helpers. Client-side via `useHousehold().isPremium`. Never trust client for premium state.
**Soft deletes:** All major tables have `deleted_at` nullable timestamp. Queries filter `isNull(table.deleted_at)`. Vercel cron `/api/cron/cleanup` purges rows older than 30 days.
**Activity feed:** Every successful write mutation calls `logActivity()` to insert into `household_activity`. Dashboard reads the last 5; `/activity` page paginates with limit/offset.

---

*Architecture analysis: 2026-05-01*
