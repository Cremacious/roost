# Roost V2

## What This Is

Roost is the household OS — a single app that replaces the patchwork of Splitwise, Cozi, group chats, and spreadsheets that families and roommates currently cobble together to manage shared life. V2 is a ground-up redesign: same features, dramatically better product. The goal is not a new feature set but a new level of coherence, usability, and appeal across web and native mobile platforms.

## Core Value

One household. One app. Everything works, everything connects, and nobody needs to be told how to use it.

## The Problem This Solves

Shared living generates constant coordination overhead: who does what, who owes what, what's happening when, what's for dinner. Today, people solve this with 4-6 separate apps that don't talk to each other and require every household member to opt in separately. Roost collapses this into one household-owned workspace. The V1 codebase proved the features work. V2 proves the product works.

## Why V2 (The Overhaul Rationale)

V1 established that all the domain features can be built. The diagnosis from the founder:

- **Too scattered**: Every feature section feels like its own disconnected mini-app
- **Hard to onboard**: New members don't know where to start or what the app is "for"
- **Weak information architecture**: Navigation groupings were driven by build order, not user mental models
- **No clear identity**: The app is neither a productivity tool, a family app, nor a social app — it floats between categories without committing
- **Monetization mismatch**: $4/month eliminates the low-friction path to adoption; a freemium+ads model better fits a household super-app at the growth stage

The V2 mandate: redesign the product from first principles, preserving all user data and the same GitHub repository, on a dedicated rebuild branch with staged migration.

## Target Users

Roost serves anyone sharing a home. Three primary personas:

**The Household Admin (primary)**
- The person who downloads the app, creates the household, and sends invites
- Motivated by frustration: "we need a system"
- Could be a parent, a "house mom" roommate, or the organized half of a couple
- Needs: quick wins to prove value to the household, enough control to keep things running
- Converts to paid if the household actually uses the app

**The Reluctant Household Member (secondary)**
- Invited by the Admin; moderate skepticism
- Motivated by: avoiding conflict, not forgetting things, keeping the household happy
- Needs: low-friction participation — checking a box, confirming a payment, seeing the grocery list
- Abandons if onboarding takes more than 60 seconds or if first session is confusing

**The Child / Teen (tertiary)**
- Added by parent; limited app surface
- Motivated by: chore rewards, seeing their progress, knowing what they need to do
- Needs: simple, fast, age-appropriate interactions

**Audience shape:**
- Families with kids: highest retention (life stage is stable, needs are recurring)
- Roommates: highest acquisition (college, young professionals) but higher churn (household ends)
- Couples: highest simplicity requirement (2 people don't need full complexity)
- Do not narrow to one segment — the household model accommodates all three naturally

## Core Jobs-to-Be-Done

1. **Keep the household coordinated on chores and tasks** — who does what, is it done, who slacked
2. **Settle shared expenses without awkwardness** — see what's owed, split it fairly, confirm it's paid
3. **Know what's happening and when** — shared calendar, meals, reminders in one place
4. **Keep the grocery list shared and current** — add from anywhere, check off in the aisle
5. **Manage the household as a unit** — member roles, permissions, household settings, kids

## Differentiation

**Against Splitwise:** Roost is a household hub, not just a bill splitter. Expenses are one tab, not the whole app.

**Against Cozi:** Roost has chores, expenses, and smart features (receipt scanning, rewards). Cozi is a 2012-era family calendar.

**Against OurHome:** Actively maintained, modern design, real premium tier with actual value.

**Against group chats:** Structured vs. ephemeral. Roost creates a persistent household record.

**Defensible moat:**
- Child accounts with rewards/allowance (unique in market)
- Receipt scanning with per-person line item splitting
- Household activity feed (shared context across all features)
- Ambient tablet mode (no competitor has this)
- Per-household pricing (not per-user — family-friendly)

## Monetization Strategy

**V2 model: Free tier with tasteful ads + Premium subscription removes ads and unlocks advanced features**

```
Free Tier
├── All core features (chores, grocery, calendar, tasks, notes, reminders)
├── 1 household, up to 5 members, 1 child account
├── Tasteful banner ads (household-relevant: cleaning products, grocery delivery, services)
└── Standard feature limits (existing FREE_TIER_LIMITS)

Premium — $4.99/month per household
├── Ad-free experience
├── Receipt scanning (Azure OCR)
├── Unlimited members, multiple households
├── Rich text notes, recurring events/reminders
├── Expense export (CSV/PDF)
├── Household stats and analytics
├── Rewards/allowance system for children
├── Guest member invites
├── Custom chore categories
└── Ambient tablet mode
```

**Ad implementation principles:**
- Tasteful banner placement only (not interstitials, not pop-ups)
- Household-relevant advertisers only (groceries, home services, cleaning, meal delivery)
- No PII shared with ad networks — contextual only
- Ads disappear instantly on premium upgrade
- Apple-native feel must be preserved — ads are a single contained zone, not scattered

**Stripe for web payments. RevenueCat for iOS/Android in-app purchase.**

## Platform Strategy

**V2 ships on three surfaces simultaneously:**

| Platform | Framework | Timeline |
|----------|-----------|----------|
| Web (desktop + mobile browser) | Next.js 16, App Router | V2 launch |
| iOS native | Expo (React Native) | V2 launch |
| Android native | Expo (same codebase as iOS) | 4-6 weeks after iOS |

**Architecture principle:** All business logic lives in `src/lib/` with zero DOM dependencies. Expo and the web app call the same API routes. UI is the only platform-specific layer.

**Web must be mobile-responsive** — the primary acquisition path will be link-sharing and SEO, which land on web. Mobile-web experience must be near-native quality.

## Product Vision for V2

### Information Architecture

V2 reorganizes the 10 feature sections into a smaller number of top-level destinations with clear mental models:

```
Home (Dashboard)
├── Today at a glance (chores due, reminders, upcoming events, grocery)
├── Household activity feed
└── Quick actions (add item, log expense, mark chore done)

Household
├── Chores + Rewards
├── Tasks
└── Calendar

Money
├── Expenses + Splitting
├── Grocery lists
└── Meal planning (meal affects grocery — they belong together)

People
├── Member management
├── Household settings
└── Your profile

More
├── Notes
├── Reminders
├── Stats / Analytics
└── Settings
```

**Navigation principle:** 5 tabs max on mobile. Everything else is one level down. The current app's problem is that every feature competes for top-level nav real estate equally, which communicates nothing about what Roost actually is.

### Design Language for V2

**Reference:** Apple's own apps (Messages, Reminders, Calendar, Files) — clean, native, purposeful. Every element earns its place.

**Design principles:**
- Content-first: UI chrome shrinks, actual data expands
- Touch-native: 48px minimum tap targets everywhere, swipe gestures
- Hierarchy through typography, not decoration
- Consistent motion: enter/exit animations, list stagger, press feedback
- No clutter: empty states are friendly, not apologetic
- Fluid across breakpoints: the same app, not a different one

**What changes from V1 design:**
- Navigation restructured (5 tabs, not 9+ items)
- Sheet-first interactions remain (bottom sheets work, keep them)
- Slab card pattern evolves — remains but becomes more restrained
- Color system: section colors become accents, not dominant forces
- Red is the brand color only — other section colors are accents, not section identifiers forced on every element
- Typography tightens: fewer weight variations, more whitespace
- Ad unit has a specific, tasteful zone — never inline with content

## Feature Prioritization

### MVP (Web + iOS V2 Launch)

**Must-have (core household coordination):**
- Auth: signup, login, child login, onboarding
- Household: create/join, member management, invite
- Chores: CRUD, completion, streaks, assignments
- Chore rewards for children
- Grocery: shared list, check/uncheck, quick add
- Calendar: events, recurring events, views
- Tasks: one-off todos, due dates, assignments
- Expenses: manual entry, splitting, settle-up flow
- Reminders: create, recurring, notify self/household
- Notes: create/edit (plain text free, rich text premium)
- Dashboard: today view, activity feed, quick actions
- Settings, billing (Stripe + RevenueCat), notifications
- Ad banner in free tier

**Must-have (V2 new):**
- Redesigned IA and navigation
- Redesigned onboarding (faster, household-first)
- iOS native app (Expo)
- Ad-supported free tier
- Meals collocated with grocery in navigation

### Phase 2 (Post-Launch)

- Android app
- Ambient tablet mode (rebuilt in Expo/web)
- Stats and analytics page
- Receipt scanning (premium)
- Expense export (premium)
- Custom chore categories (premium)
- Multiple grocery lists (premium)
- Guest member invites (premium)
- Advanced reporting/household insights
- Spanish localization (i18n pass)

### Deliberately Deferred

- Real-time features (WebSocket/Supabase Realtime) — 10s polling is sufficient for V2
- In-app payments/Venmo integration — settle up is informational
- AI/LLM features — not in scope for V2
- Public community features — this is a private household app

## Domain Model / Core Entities

```
Household
├── id, name, invite_code, subscription_status, stripe info
├── → members[] (household_members)
└── → all features scoped by household_id

User
├── id, email, name, role, avatar_color, timezone
├── is_child_account, child_pin (hashed)
├── theme, latitude, longitude, temperature_unit
└── onboarding_completed, has_seen_welcome

HouseholdMember
├── user_id, household_id, role (admin/member/child/guest)
├── expires_at (guests only)
└── → permissions[] (member_permissions)

Chore
├── title, description, frequency, assigned_to
├── category_id, next_due_at, last_completed_at
└── → completions[], streaks[]

Expense
├── title, amount, paid_by, category_id
├── is_recurring_draft, recurring_template_id
└── → splits[] (expense_splits), receipt_data

CalendarEvent
├── title, start_time, end_time, all_day
├── recurring, frequency, repeat_end_type
└── → attendees[] (event_attendees)

GroceryList (default + premium multiple)
└── → items[] (grocery_items: name, quantity, checked, added_by)

Meal
├── name, category, description, prep_time, ingredients[]
└── → plan_slots[] (meal_plan_slots: date, slot_type)

Task
├── title, description, assigned_to, due_date, priority
└── completed, completed_at

Note
├── title, content (plain or HTML), created_by
└── deleted_at (soft delete)

Reminder
├── title, note, remind_at, frequency, notify_type
├── next_remind_at, snoozed_until, completed
└── → receipts[] (reminder_receipts)

RewardRule
├── user_id (child), period_type, threshold_percent
├── reward_type, reward_detail
└── → payouts[] (reward_payouts)
```

## Global Product Rules

1. **Household-scoped:** Every data entity belongs to exactly one household. Users can belong to multiple households (premium) but context is always one household at a time.

2. **Role-based access:** Admin > Member > Guest > Child. Roles set defaults; admin can fine-tune per-user permissions.

3. **Child finance block:** Children never see expenses. Enforced at API level (403), never just client-side.

4. **Premium enforcement:** `households.subscription_status` is the single source of truth. Checked server-side on every gated action. Never trust the client for premium state.

5. **Soft deletes:** All major tables use `deleted_at`. Vercel cron purges after 30 days.

6. **Optimistic UI:** Mutations apply immediately in the UI, revert on error, confirm via `onSettled` invalidation.

7. **Ad placement:** Ads appear only in a designated banner zone. Never inline with content. Never during critical flows (onboarding, checkout, settling expenses).

8. **iOS / Android parity:** Every feature in the web app must be accessible in the native app. Platform-specific interactions (e.g., notifications, share sheets) are enhanced, not required.

9. **No emojis anywhere:** Lucide icons only. This is a design rule, not a preference.

10. **Touch-first:** 48px minimum tap targets. Swipe-to-dismiss on sheets. 64px for list rows.

## Migration and Cutover Strategy

### Approach: Rebuild Branch + Staged Cutover

```
main (V1, production)
    │
    └─ rebuild/v2 (V2 development)
         │
         └─ merge to main at cutover
```

**Phase 1: Parallel development**
- All V2 work happens on `rebuild/v2`
- V1 stays live in production; V2 runs on a staging URL
- Zero impact to existing users

**Phase 2: Database compatibility**
- Neon database is shared — V2 reads the same data
- Schema changes must be additive (no column drops, no renames) until cutover
- New columns added with defaults or nullable
- `db:push` strategy continues — Drizzle push applied to shared DB from V2 branch
- Any backfills run as one-off scripts against production DB with explicit user review before execution

**Phase 3: Cutover**
- Feature flag or environment variable gates V1 vs V2 UI
- Canary approach: V2 serving a small % of traffic, then full cutover
- Rollback: flip feature flag back to V1 (same API, same DB)

**Data preservation rules:**
- All existing user IDs, household IDs, and member associations preserved
- `subscription_status` preserved — existing premium users stay premium
- Soft-delete records preserved (not purged prematurely during migration)
- Child accounts preserved — both `user` and `users` table entries
- No user is asked to re-authenticate — sessions are valid across V1/V2

**Breaking changes to avoid:**
- No column renames on core tables during active V2 development
- No table drops until V2 has been live for 30 days
- No changes to `household_members.role` enum values
- No changes to auth table structure (better-auth managed)

## Context

**Current tech stack (preserved in V2):**
- Next.js 16 App Router, TypeScript, Tailwind v4
- Drizzle ORM + Neon (PostgreSQL)
- better-auth (sessions, email/password, child PIN)
- TanStack Query, Zustand, framer-motion
- shadcn/ui + Lucide icons
- Stripe (web) + RevenueCat (iOS/Android)
- Azure Document Intelligence (receipt OCR)
- Expo (React Native) for iOS/Android
- Vercel hosting + Vercel Cron
- Resend (transactional email)

**Expo strategy:**
- All business logic in `src/lib/` (zero DOM dependencies) — already Expo-compatible
- Expo app calls same API routes as web
- Expo UI lives in a separate directory (`mobile/` or `apps/mobile/`)
- Shared types via TypeScript path aliases

**Known technical debt to address in V2:**
- `getUserHousehold` should move from `src/app/api/chores/route.ts` to `src/lib/auth/helpers.ts`
- No Zod validation on several API routes — add systematically
- Hardcoded hex values in some component files — centralize to `colors.ts`
- No migration files (db:push only) — acceptable for now but risky at scale

## Constraints

- **Repository:** Same GitHub repo (`personal/roost`), rebuild branch strategy
- **Database:** Neon PostgreSQL — preserve all existing data, no destructive migrations
- **Solo dev:** One developer; architecture must prioritize clear boundaries and minimal cross-cutting complexity
- **Timeline:** 3-4 months to web + iOS launch
- **Budget:** Minimal operating cost maintained — Vercel free/hobby, Neon free tier, Azure F0 (500 scans/month free), Expo push free, Resend free tier
- **Auth:** better-auth is locked in — no auth library replacement in V2
- **Ads:** Must not degrade the Apple-native design feel — tasteful banner zones only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep all existing features | Nothing is wrong with the features — the UX/IA is what needs fixing | — Pending |
| Rebuild branch, not a new repo | Preserves git history, existing deploy config, and avoids data migration complexity | — Pending |
| Free + ads model | Removes paywall friction for household adoption; premium removes ads + unlocks advanced features | — Pending |
| Price: $4.99/mo (up from $4) | Small increase justified by ad-free value; RevenueCat/App Store pricing alignment | — Pending |
| Web + iOS simultaneous launch | iOS is primary mobile target; web must ship together for link-based acquisition | — Pending |
| Expo for mobile | Business logic already DOM-free; same API; proven pattern for this stack | — Pending |
| 5-tab max navigation | Forces IA discipline; current 9+ item nav is the root cause of "too scattered" feel | — Pending |
| Meals grouped with Grocery | Both relate to food; they share data (ingredients to grocery); logical grouping | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Requirements

### Validated (V1 — Shipped Features)

- ✓ Email/password authentication with session management — V1
- ✓ Child account login via household code + PIN — V1
- ✓ Household creation, joining by invite code — V1
- ✓ Chores: CRUD, completion tracking, streaks, leaderboard — V1
- ✓ Grocery: shared lists, item check/uncheck, multi-list (premium) — V1
- ✓ Calendar: month/agenda views, recurring events (premium) — V1
- ✓ Tasks: one-off todos, priority, due dates, assignments — V1
- ✓ Notes: plain text + rich text (premium, Tiptap) — V1
- ✓ Expenses: manual entry, 3 split methods, debt simplification, settle-up — V1
- ✓ Receipt scanning via Azure Document Intelligence (premium) — V1
- ✓ Meal planning: bank, weekly planner, suggestions, grocery integration — V1
- ✓ Reminders: recurring, notify types, banner, Vercel cron — V1
- ✓ Chore rewards/allowance for children — V1
- ✓ Guest member invites with expiry — V1
- ✓ Stripe billing: Checkout, webhooks, cancel/reactivate, Customer Portal — V1
- ✓ Household stats page (premium, Recharts) — V1
- ✓ Superadmin panel with user/household management — V1
- ✓ Promo code system (time-limited + lifetime) — V1
- ✓ Theme system (default/midnight) — V1
- ✓ Activity feed — V1

### Active (V2 Goals)

- [ ] Redesigned information architecture (5-tab navigation model)
- [ ] Redesigned onboarding (faster, household-first, under 60 seconds)
- [ ] Redesigned UI language (Apple-native feel, restrained color use, content-first)
- [ ] Ad-supported free tier (tasteful banners, household-relevant advertisers)
- [ ] iOS native app via Expo (feature-complete at launch)
- [ ] Android native app via Expo (follows iOS by 4-6 weeks)
- [ ] Rebuild branch strategy with staged cutover
- [ ] RevenueCat integration for in-app purchase on iOS/Android
- [ ] Expo Push Notifications wired to reminders and chore alerts
- [ ] Meals + Grocery collocated in navigation
- [ ] Dashboard redesigned as "Today" view (chores due, reminders, upcoming events, grocery)
- [ ] Marketing homepage redesigned to match V2 product and positioning
- [ ] All V1 validated features ported to V2 with improved UX

### Out of Scope

- Real-time collaboration (WebSockets, Supabase Realtime) — 10s polling sufficient; complexity not justified for V2
- In-app payments / Venmo / banking integration — settle-up is informational; payments stay external
- AI/LLM features (meal suggestions, smart categorization) — not in V2 scope; revisit post-launch
- Public community / social features — private household app; no public profiles
- Multi-language at launch — English only for V2; Spanish deferred to V3
- Video/audio attachments — storage costs, edge cases; not core to household coordination
- Custom domain for households — enterprise feature, not consumer
- Web push notifications — Expo push for native; in-app banners for web

---
*Last updated: 2026-05-01 after initial V2 project definition*
