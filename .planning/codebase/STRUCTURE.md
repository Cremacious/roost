# Codebase Structure

**Analysis Date:** 2026-05-01

## Directory Layout

```
roost/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (admin)/                # Admin panel route group (separate auth)
│   │   │   ├── admin/              # /admin, /admin/users, /admin/households, /admin/promo-codes
│   │   │   └── layout.tsx          # Jose JWT auth + dark nav shell
│   │   ├── (app)/                  # Authenticated app route group
│   │   │   ├── activity/           # /activity — full paginated feed
│   │   │   ├── calendar/           # /calendar — month + agenda views
│   │   │   ├── chores/             # /chores — list, /chores/history, /chores/allowances
│   │   │   ├── dashboard/          # /dashboard — tile grid + activity feed
│   │   │   ├── expenses/           # /expenses, /expenses/budget, /expenses/insights
│   │   │   ├── grocery/            # /grocery
│   │   │   ├── meals/              # /meals — planner/bank/suggestions tabs
│   │   │   ├── members/            # /members
│   │   │   ├── notes/              # /notes
│   │   │   ├── onboarding/         # /onboarding — 3-step create/join flow
│   │   │   ├── reminders/          # /reminders
│   │   │   ├── settings/           # /settings, /settings/billing
│   │   │   ├── stats/              # /stats — premium household analytics
│   │   │   ├── tasks/              # /tasks
│   │   │   └── layout.tsx          # QueryProvider + AppShell
│   │   ├── (auth)/                 # Unauthenticated auth route group
│   │   │   ├── child-login/        # /child-login — household code + PIN
│   │   │   ├── forgot-password/    # /forgot-password
│   │   │   ├── login/              # /login
│   │   │   ├── reset-password/     # /reset-password
│   │   │   └── signup/             # /signup
│   │   ├── api/                    # API route handlers
│   │   │   ├── admin/              # Admin API (separate jose auth)
│   │   │   ├── auth/               # better-auth catch-all + child-login
│   │   │   ├── calendar/           # Calendar CRUD
│   │   │   ├── chore-categories/   # Category CRUD + suggest
│   │   │   ├── chores/             # Chores CRUD + complete + leaderboard + history
│   │   │   ├── cron/               # Vercel cron jobs (reminders, rewards, subscription, etc.)
│   │   │   ├── dashboard/          # /api/dashboard/summary — single aggregated endpoint
│   │   │   ├── dev/                # /api/dev/toggle-premium (dev-only, 403 in prod)
│   │   │   ├── expenses/           # Expenses + splits + settle + recurring + export + scan
│   │   │   ├── grocery/            # Lists + items CRUD
│   │   │   ├── household/          # Create, join, members, invite, me
│   │   │   ├── invite/             # Public invite token validation + join
│   │   │   ├── meals/              # Planner + bank + suggestions + voting
│   │   │   ├── members/            # Member list
│   │   │   ├── notes/              # Notes CRUD
│   │   │   ├── notifications/      # Push token storage
│   │   │   ├── observability/      # Client error event ingestion
│   │   │   ├── promo-codes/        # Redeem + status
│   │   │   ├── reminders/          # Reminders CRUD + complete + seen + due
│   │   │   ├── rewards/            # Reward rules + payouts + child view
│   │   │   ├── settings/           # Billing settings + usage
│   │   │   ├── stats/              # Premium household stats (22 parallel queries)
│   │   │   ├── stripe/             # Checkout, webhook, cancel, portal, reactivate
│   │   │   ├── tasks/              # Tasks CRUD
│   │   │   └── user/               # Profile, preferences, theme, password, dismiss-welcome
│   │   ├── invite/                 # Public invite landing page (outside app shell)
│   │   │   └── [token]/
│   │   ├── globals.css             # Tailwind + shadcn vars + --roost-* defaults + Tiptap styles
│   │   ├── layout.tsx              # Root layout: fonts, ThemeProvider, Toaster
│   │   └── page.tsx                # Public marketing homepage (server component)
│   ├── components/
│   │   ├── auth/                   # GoogleAuthButton
│   │   ├── calendar/               # EventSheet, DaySheet
│   │   ├── chores/                 # ChoreSheet, LeaderboardSheet, RewardRuleSheet, choreIconMap, ChoreCategoryPicker
│   │   ├── dashboard/              # Dashboard-specific sub-components
│   │   ├── dev/                    # DevTools (dev-only, dynamically imported)
│   │   ├── expenses/               # ExpenseSheet, SettleSheet, ExportSheet, ReceiptScanner, LineItemEditor, RecurringDraftSheet, EditRecurringSheet, MockExpensesPreview
│   │   ├── grocery/                # GroceryItemSheet, GroceryListSheet
│   │   ├── layout/                 # AppShell, Sidebar, TopBar, BottomNav, PageContainer
│   │   ├── marketing/              # Marketing page sub-components
│   │   ├── meals/                  # MealSheet, MealSlotSheet, SuggestionSheet
│   │   ├── notes/                  # NoteSheet, RichTextEditor
│   │   ├── providers/              # ThemeProvider, ObservabilityProvider, ScrollToTop, WebVitals
│   │   ├── reminders/              # ReminderSheet
│   │   ├── settings/               # MemberSheet, InviteGuestSheet, AddChildSheet
│   │   ├── shared/                 # Cross-feature reusable components (see Key Files below)
│   │   ├── tasks/                  # TaskSheet
│   │   └── ui/                     # shadcn primitives (button, dialog, sheet, etc.)
│   ├── db/
│   │   └── schema/                 # 21 Drizzle schema files + index.ts re-export
│   │       ├── index.ts            # Re-exports all tables — import from here always
│   │       ├── auth.ts             # better-auth tables (user, session, account, verification)
│   │       ├── households.ts
│   │       ├── users.ts            # App user table (extends better-auth user)
│   │       ├── members.ts          # household_members, member_permissions
│   │       ├── chores.ts           # chores, chore_completions, chore_streaks
│   │       ├── choreCategories.ts
│   │       ├── grocery.ts          # grocery_lists, grocery_items
│   │       ├── tasks.ts
│   │       ├── calendar.ts         # calendar_events, event_attendees
│   │       ├── notes.ts
│   │       ├── expenses.ts         # expenses, expense_splits
│   │       ├── recurring_expenses.ts
│   │       ├── categories.ts       # expense_categories, expense_budgets
│   │       ├── meals.ts            # meals, meal_plan_slots, meal_suggestions, meal_suggestion_votes
│   │       ├── reminders.ts        # reminders, reminder_receipts
│   │       ├── allowances.ts       # reward_rules, reward_payouts (+ legacy tables)
│   │       ├── activity.ts         # household_activity
│   │       ├── notifications.ts    # notification_queue
│   │       ├── invites.ts          # household_invites
│   │       ├── promoCodes.ts       # promo_codes, promo_redemptions
│   │       └── security.ts
│   ├── lib/
│   │   ├── admin/                  # Admin-panel-only: auth.ts (jose JWT), requireAdmin.ts, testFilters.ts
│   │   ├── auth/                   # better-auth: index.ts (server config), client.ts, helpers.ts, client-redirects.ts
│   │   ├── constants/              # colors.ts, themes.ts, freeTierLimits.ts, premiumGateConfig.ts
│   │   ├── db/                     # index.ts — Neon + Drizzle singleton
│   │   ├── email/                  # auth-emails.ts (Resend transactional email)
│   │   ├── hooks/                  # useHousehold.ts, use-paginated-list.ts, useIsClient.ts, useUserPreferences.ts
│   │   ├── observability/          # Client error tracking
│   │   ├── security/               # request.ts (IP, CSRF), rateLimit.ts, csp.ts
│   │   ├── store/                  # themeStore.ts (Zustand)
│   │   └── utils/                  # Shared pure utilities (see Key Files below)
│   ├── __tests__/                  # Unit tests (Vitest)
│   │   ├── algorithms/             # debtSimplification.test.ts, allowance.test.ts
│   │   ├── components/
│   │   └── utils/                  # time.test.ts
│   └── types/                      # TypeScript type declarations
├── e2e/                            # Playwright E2E tests
│   ├── *.spec.ts                   # auth, chores, grocery, navigation, onboarding, premium, billing, etc.
│   ├── global-setup.ts             # DB seed + auth state (free-admin.json, premium-admin.json)
│   ├── global-teardown.ts
│   └── .auth/                      # Saved browser storage states (gitignored)
├── public/
│   └── brand/                      # Logo assets (placeholder currently in RoostLogo.tsx)
├── src/db/seed.ts                  # Idempotent seed script: npm run db:seed
├── vercel.json                     # 7 Vercel cron schedules
├── playwright.config.ts            # E2E config: 5 projects (free/premium/unauthenticated/mobile variants)
├── tailwind.config.ts              # Tailwind v4 config
└── tsconfig.json                   # Path aliases: @/ → src/
```

## Directory Purposes

**`src/app/(app)/`:**
- Purpose: All authenticated user-facing pages
- Contains: One directory per feature, each with `page.tsx` (client component)
- Key files: `dashboard/page.tsx`, `chores/page.tsx`, `expenses/page.tsx`

**`src/app/api/`:**
- Purpose: All HTTP API endpoints; each `route.ts` exports named HTTP method handlers
- Contains: Feature-grouped subdirectories; `cron/` for scheduled jobs
- Key files: `chores/route.ts` (exports `getUserHousehold`, `calcNextDueAt` helpers), `dashboard/summary/route.ts`

**`src/components/shared/`:**
- Purpose: Cross-feature reusable UI components
- Contains: SlabCard, EmptyState, ErrorState, PremiumGate, DraggableSheet, PageHeader, MemberAvatar, RoostLogo, StatCard, SectionColorBadge, QueryProvider, ReminderBanner, RewardsWidget, WelcomeModal

**`src/components/layout/`:**
- Purpose: App shell components
- Contains: AppShell, Sidebar, TopBar, BottomNav, PageContainer

**`src/db/schema/`:**
- Purpose: Drizzle ORM table definitions — one file per domain
- Contains: 21 schema files; always import tables from `src/db/schema/index.ts`
- Note: No migration files; apply changes with `npm run db:push`

**`src/lib/auth/`:**
- Purpose: Authentication layer
- Contains: `index.ts` (better-auth server config), `client.ts` (signIn/signUp/signOut/useSession), `helpers.ts` (requireSession, requireHouseholdMember, requirePremium, blockChild), `client-redirects.ts`

**`src/lib/utils/`:**
- Purpose: Pure shared utilities with zero DOM dependencies
- Contains: `activity.ts`, `premiumGating.ts`, `recurrence.ts`, `debtSimplification.ts`, `grocerySort.ts`, `azureReceipts.ts`, `stripe.ts`, `time.ts`, `logger.ts`, `inviteToken.ts`, `imageUpload.ts`, `seedChoreCategories.ts`, `seedCategories.ts`

**`src/lib/constants/`:**
- Purpose: App-wide configuration constants
- Key files:
  - `colors.ts` — SECTION_COLORS (chores/grocery/calendar/expenses/meals/notes/reminders/tasks/stats); always import from here
  - `themes.ts` — THEMES, DEFAULT_THEME, ThemeKey (default | midnight)
  - `freeTierLimits.ts` — FREE_TIER_LIMITS, PREMIUM_FEATURES, getLimit(), isPremiumFeature()
  - `premiumGateConfig.ts` — PREMIUM_GATE_CONFIG (13 feature entries with perks, icon, copy)

**`src/lib/admin/`:**
- Purpose: Admin panel auth (completely separate from better-auth)
- Contains: `auth.ts` (jose JWT createAdminSession/verifyAdminSession), `requireAdmin.ts`, `testFilters.ts`

**`e2e/`:**
- Purpose: Playwright E2E tests
- Contains: 12 spec files; `global-setup.ts` seeds DB and saves auth state
- Seed accounts: `admin.free@roost.test`, `admin.premium@roost.test`, `member@roost.test`

## Key File Locations

**Entry Points:**
- `src/proxy.ts`: Middleware — all routing decisions happen here
- `src/app/layout.tsx`: Root layout — font, theme, toaster
- `src/app/(app)/layout.tsx`: App shell — QueryProvider + AppShell
- `src/app/page.tsx`: Public marketing homepage

**Configuration:**
- `vercel.json`: Cron schedules (7 jobs)
- `src/lib/constants/freeTierLimits.ts`: All free vs premium limits
- `src/lib/constants/premiumGateConfig.ts`: Premium gate UI config for all 13 feature slugs
- `src/lib/constants/colors.ts`: All section hex colors (single source of truth)
- `src/lib/constants/themes.ts`: Theme CSS variable values

**Core Logic:**
- `src/lib/auth/helpers.ts`: All server-side auth/authorization helpers
- `src/app/api/chores/route.ts`: Exports `getUserHousehold()` + `calcNextDueAt()` (imported widely)
- `src/lib/utils/premiumGating.ts`: All resource limit checkers
- `src/lib/utils/activity.ts`: `logActivity()` helper
- `src/lib/db/index.ts`: Drizzle + Neon singleton

**Schema:**
- `src/db/schema/index.ts`: Import all tables from here (never import from individual schema files directly)
- `src/db/seed.ts`: `npm run db:seed` — idempotent test data

**Testing:**
- `playwright.config.ts`: E2E project config
- `e2e/global-setup.ts`: Auth state setup
- `src/__tests__/`: Vitest unit tests

## Naming Conventions

**Files:**
- Page files: `page.tsx` (always, Next.js App Router convention)
- API routes: `route.ts` (always, Next.js App Router convention)
- Components: PascalCase — `ChoreSheet.tsx`, `DraggableSheet.tsx`
- Hooks: camelCase with `use` prefix — `useHousehold.ts`, `use-paginated-list.ts` (kebab also seen for shadcn-style hooks)
- Utilities: camelCase — `activity.ts`, `premiumGating.ts`, `recurrence.ts`
- Schema files: camelCase domain name — `choreCategories.ts`, `recurring_expenses.ts` (mixed — some use snake_case)
- Test files: `*.test.ts` (Vitest unit), `*.spec.ts` (Playwright E2E)

**Directories:**
- Feature component folders: lowercase plural — `chores/`, `expenses/`, `grocery/`
- Route group folders: parentheses — `(app)/`, `(auth)/`, `(admin)/`
- Dynamic segments: brackets — `[id]/`, `[token]/`, `[...all]/`

**Variables/Functions:**
- React components: PascalCase
- Hooks: `useXxx` camelCase
- API handler functions: Named HTTP method exports (`GET`, `POST`, `PATCH`, `DELETE`)
- Constants: SCREAMING_SNAKE_CASE for config objects (`FREE_TIER_LIMITS`, `SECTION_COLORS`)
- Database columns: snake_case (Drizzle schema reflects DB conventions)

## Where to Add New Code

**New Feature Page (e.g. `/widgets`):**
- Page: `src/app/(app)/widgets/page.tsx`
- API route: `src/app/api/widgets/route.ts` + `src/app/api/widgets/[id]/route.ts`
- Components: `src/components/widgets/WidgetSheet.tsx`, etc.
- Schema: `src/db/schema/widgets.ts` — add export to `src/db/schema/index.ts`
- Section color: Add to `src/lib/constants/colors.ts` SECTION_COLORS
- Nav: Add to `NAV_ITEMS` in `src/components/layout/Sidebar.tsx` + `MORE_ITEMS` in `BottomNav.tsx` + dashboard tiles

**New Premium Gate:**
- Add error code to route (string constant)
- Add entry to `PREMIUM_GATE_CONFIG` in `src/lib/constants/premiumGateConfig.ts`
- Add feature slug to `PremiumGateFeature` union type in `src/components/shared/PremiumGate.tsx`
- Add `FEATURE_PREMIUM` entry to error codes list in `src/lib/constants/freeTierLimits.ts`

**New API Route:**
- Create `src/app/api/[domain]/route.ts`
- Start with: `const { membership } = await requireCurrentMembership(request)` or `const { session, member } = await requireHouseholdMember(request, householdId)`
- For premium features: call `await requirePremium(request, householdId)` before DB writes
- End write mutations with: `await logActivity({ householdId, userId, type, description })`

**New Cron Job:**
- Create `src/app/api/cron/[name]/route.ts`
- Validate: `if (request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) return 401`
- Add schedule to `vercel.json` crons array

**New Schema Table:**
- Create `src/db/schema/[domain].ts`
- Add `export * from "./[domain]"` to `src/db/schema/index.ts`
- Run `npm run db:push` to sync to Neon
- Include `deleted_at` timestamp nullable for soft-delete pattern

**Shared UI Component:**
- If used across 2+ features: `src/components/shared/ComponentName.tsx`
- If feature-specific: `src/components/[feature]/ComponentName.tsx`
- All cards: use `SlabCard` from `src/components/shared/SlabCard.tsx`
- All bottom sheets: use `DraggableSheet` from `src/components/shared/DraggableSheet.tsx`
- Empty states: use `EmptyState` from `src/components/shared/EmptyState.tsx`

**Client-Side Data Fetching:**
- Use TanStack Query via `useQuery` / `useMutation`
- Query keys: string array `["feature-name"]` or `["feature-name", id]`
- Mutations: follow optimistic update pattern (cancelQueries → setQueryData → API call → onError revert → onSettled invalidate)

## Special Directories

**`e2e/.auth/`:**
- Purpose: Saved Playwright browser storage states (session cookies for test accounts)
- Generated: Yes, by `e2e/global-setup.ts`
- Committed: No (gitignored, `.gitkeep` tracks directory)

**`src/components/ui/`:**
- Purpose: shadcn/ui primitives — generated components, not hand-written
- Generated: Yes (via shadcn CLI)
- Committed: Yes

**`src/app/(admin)/`:**
- Purpose: Internal superadmin panel, not user-facing
- Access: Protected by IP allowlist + separate jose JWT cookie
- Note: Routes render with separate dark layout, no app ThemeProvider CSS vars

**`public/brand/`:**
- Purpose: Final logo assets when designer delivers them
- Generated: No
- Committed: Yes (placeholder only currently; final swap instructions in `public/brand/README.md`)

---

*Structure analysis: 2026-05-01*
