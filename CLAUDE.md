@AGENTS.md
# Roost — Project Intelligence

## What This Is
Household management app. The household OS for families, roommates,
and college students. Chores, grocery lists, meal planning, bill
splitting, calendar, notes, reminders, ambient tablet mode.
Web first (Next.js), then iOS via Expo, then Android.

## Elevator Pitch
One app for families and roommates to manage chores, groceries,
money, and schedules together. Competes with Splitwise + Cozi +
OurHome combined. Key differentiators: receipt scanning, child
accounts with nagging notifications, ambient tablet mode,
per-household pricing.

## Tech Stack
- Next.js 16 App Router, TypeScript, Tailwind v4
- Drizzle ORM + Neon (PostgreSQL)
- better-auth (sessions)
- TanStack Query (10s polling — real-time not required)
- Zustand (client state)
- shadcn/ui + Lucide icons (NO emojis anywhere)
- Stripe (web payments) + RevenueCat (iOS/Android billing)
- Google Vision API (receipt OCR)
- Expo Push Notifications (free, iOS + Android)
- Vercel hosting + Vercel Cron (scheduled jobs)
- Resend (transactional email — invites only)
- Open-Meteo (weather, free, no key needed)

## Pricing Model
- Free tier: 1 household, up to 5 members, core features
- Premium: $3/month per household (not per user)
- Admin pays, all household members benefit
- Stripe for web, RevenueCat for iOS/Android in-app purchase

## Operating Costs (at launch = ~$0/month)
- Vercel: free hobby tier
- Neon: free tier (0.5GB)
- Google Vision: free up to 1,000 units/month
- Expo push: free forever
- Resend: 3,000 emails/month free
- Open-Meteo: free, no key
- Stripe: 2.9% + 30c per transaction only
- RevenueCat: free up to $2.5k MRR

## Account Roles
Four roles. Roles are baseline presets. Admin can fine-tune
any individual user via per-user permission checklist in settings.

Child (preset — no finance access ever):
- Chores: view + complete own
- Grocery: view + add items
- Calendar: view only
- Tasks: none
- Expenses: 403 always, no exceptions
- Notes: none

Member:
- Chores: view + complete
- Grocery: full access
- Calendar: view + add events
- Tasks: view + complete own
- Expenses: view only
- Notes: view + create

Admin (free):
- Everything Member has
- Invite + remove members
- Assign chores to anyone
- Manage household settings
- Per-user permission checklist
- Delete household

Admin (premium):
- Everything Admin has
- Bill splitting
- Receipt scanning (Google Vision)
- Expense tracking + history
- Ambient tablet mode
- Multiple grocery lists
- Multiple households (premium only)

## Permission Rules
- Premium check is server-side on households.subscription_status
- Child finance block is enforced at API level (403), never client
- Free tier limits enforced server-side, never trust client
- Roles set default permissions
- Admin can override individual permissions per user via checklist
- A user can belong to multiple households on premium only

## Competitors
- Splitwise: bill splitting only, no household mgmt
- Cozi: calendar/grocery, no bill splitting, dated UI
- OurHome: shallow, mostly abandoned
- Our edge: the combination + receipt scanning + child accounts
  + ambient mode + household pricing model

## Platform Strategy
1. Web (Next.js) — launch first, also mobile browser fallback
2. iOS (Expo) — primary mobile target after web
3. Android (Expo) — comes nearly free after iOS (~2 weeks extra)
All business logic lives in src/lib/ with zero DOM dependencies
so Expo can reuse it. UI stays in Next.js. Expo calls same API routes.

## Notifications
- Web: in-app banners only
- iOS/Android: Expo Push (free)
- Nagging chore reminders: Vercel cron fires Expo push API
- Push tokens stored per user in DB
- No email notifications (nobody reads them)
- Email used only for: invite links, account verification

## Features — Chores vs Tasks
Chores: recurring household duties (vacuum weekly, dishes daily)
  - Assigned to member, has frequency, resets on schedule
  - Reset time based on assigned person's timezone
  - Completion tracked per person for leaderboard
Tasks: one-off to-dos
  - Fields: name, description, assigned_to, due_date, priority
  - Not recurring, just done or not done

## Features — Grocery Lists
- One default shared list per household
- Premium: multiple named lists (Costco run, Target, etc)
- Optimistic UI for check/uncheck
- Soft delete with auto-purge after 30 days

## Features — Bill Splitting
- Track who owes what, no in-app payments
- Users settle in cash/Venmo themselves
- Debt simplification: if A owes B and B owes C, simplify to A owes C
- Receipt scanning: photo in-app, Google Vision OCR,
  editable line items, manual fallback if scan fails

## Features — Gamification
- Chore leaderboard + streaks per household
- Streak = consecutive days all assigned chores completed
- Missing one day breaks streak
- Leaderboard resets weekly
- Points displayed per member

## Features — Ambient Tablet Mode (premium)
- Fully customizable widgets
- Available widgets: weather, clock, pending chores,
  upcoming calendar events, household activity feed
- Screensaver activates on idle
- Uses Open-Meteo for weather (free, no key)

## Features — Household Lifecycle
- Admin = person who holds the subscription
- If admin cancels: household enters 30-day grace period,
  then deleted if no new admin takes over
- Member can leave anytime
- Admin can remove any member
- Expense history shows "Former Member" for removed users

## Features — Permissions Checklist
- Admin settings has per-user toggle list
- Role presets (Child/Member) auto-apply defaults
- Admin can then fine-tune individual toggles
- Changes take effect immediately server-side

## Features — Onboarding
- New user: create household OR join with code
- Household code is shareable (not email-based)
- Joiner setup: display name, timezone
- Child accounts: PIN set by parent, no email needed

## Features — Internationalization
- English + Spanish at launch
- Build with i18n from day one (next-intl recommended)
- All UI copy goes through translation keys, no hardcoded strings

## Data Rules
- Soft deletes: deleted_at timestamp on all major tables
- Auto-purge: Vercel cron cleans deleted_at > 30 days old
- Timezone: stored per user, used for chore reset scheduling
- Former members: anonymized display, expense history preserved

## Design System
- Light mode default, dark mode via next-themes
- Section colors (fixed, never change):
  chores = #EF4444
  grocery = #F59E0B
  calendar = #3B82F6
  expenses = #22C55E
  meals = #F97316
  notes = #A855F7
  reminders = #06B6D4
  tasks = #EC4899
- Touch targets: 48px minimum, 64px for list rows
- No hover-only interactions, touch first
- No emojis anywhere, Lucide icons only
- No em dashes in any copy or UI text
- CarPlay-inspired large tile grid on tablet + desktop
- Bottom tab bar on mobile (Home, Chores, Grocery, Calendar, Profile)
- UI scales: phone / tablet / desktop

## Folder Structure
src/db/schema/       Drizzle schema files, split by domain
src/lib/auth/        better-auth config
src/lib/db/          Neon client + Drizzle instance
src/lib/utils/       Shared utilities, NO DOM dependencies
src/lib/hooks/       Shared hooks, NO DOM dependencies
src/lib/constants/   App-wide constants
src/types/           TypeScript types and interfaces
src/app/(auth)/      login, signup, child-login
src/app/(app)/       All authenticated routes
src/app/api/         API route handlers
src/components/ui/         shadcn primitives
src/components/layout/     Shell, nav, sidebar
src/components/dashboard/  Home screen components
src/components/shared/     Reused across features

## API Rules
- All routes validate session + household membership before DB
- Child accounts: financial endpoints always return 403
- Free tier limits checked server-side before writes
- Optimistic UI for: grocery check/uncheck, chore completion
- Server confirmation required for: expenses, payments, members
- Schema entry point: src/db/schema/index.ts re-exports all tables

## Build Phases
Phase 1 — Foundation (start here)
  Schema: all tables defined before any UI
  Auth: signup, login, child PIN login
  Household: create, join by code, invite flow
  Middleware: session guard on (app) routes

Phase 2 — Daily Use
  Chores: assign, recurring schedule, complete, streaks
  Grocery: shared list, optimistic check/uncheck
  Calendar: events, shared view
  Tasks: create, assign, due date, priority
  Notes: create, view
  Push notification setup (Expo)

Phase 3 — Money (premium)
  Expenses: manual entry, who owes whom
  Bill splitting: debt simplification
  Receipt scanning: Google Vision, editable line items

Phase 4 — Polish
  Ambient tablet mode + widget customization
  Meal planning
  Expo iOS app
  Android submission
  i18n Spanish pass

## Environment Variables
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
GOOGLE_VISION_API_KEY
EXPO_ACCESS_TOKEN

## Session Handoff
At the start of each new session fetch this file to restore context.
Share GitHub file URLs, paste code, or describe what was built.
Update this file after every major decision or completed phase.
Last updated: 2026-04-05


Rules:
- Follow all design rules in CLAUDE.md
- No emojis, use Lucide icons
- Use sonner for all toasts (never @/components/ui/toast)
- Touch targets 48px minimum
- Confirm when done and list files changed