# Roost V2 — Implementation Plan

**Date:** 2026-05-05
**Status:** Active
**Design spec:** `docs/superpowers/specs/2026-05-05-roost-v2-design.md`
**Approach:** Ground-up rewrite in the same repo. V1 code is inspiration only — nothing is ported as-is. Fresh Neon DB. V1 stays live until V2 cutover.

---

## Key Departures from Existing .planning/ Docs

These decisions from brainstorming override the prior planning docs:

| Prior decision | V2 decision |
|---|---|
| Apple-native feel, restrained color | Refined V1 — keep red/slab, polish execution |
| Section colors as accents only | Section colors stay as dominant identities per feature |
| Port V1 features "unchanged" | Rewrite everything with V2 UX decisions applied |
| Careful data migration strategy | Fresh Neon DB — no migration, no V1 data constraints |
| Receipt scanning is premium-only | 75 scans/month free (hidden cap), premium = unlimited |
| No referral system | 2 free months per paying referral, max 3 per account |
| V1 streaks + leaderboard unchanged | Streak calendar + integrated reward bar + nudge button |
| V1 meal planner unchanged | Grocery integration priority, URL import, rotation picks |
| No admin quick-lock | Long-press quick-lock per member |
| $4/month | $5/month (from design spec) |

---

## Timeline Overview

| Phase | Name | Duration | Blocks |
|---|---|---|---|
| 0 | Foundation | 1 week | everything |
| 1 | Shell + Auth + Onboarding | 2 weeks | Phase 2 |
| 2 | Daily Use Features | 3 weeks | Phase 3 |
| 3 | Money + Calendar + Finishing | 3 weeks | Phase 4 |
| 4 | iOS Native (Expo) | 4–5 weeks | Phase 5 |
| 5 | Revenue + Launch | 2 weeks | Phase 6 |
| 6 | Android + Post-launch | 2–4 weeks | — |

**Total: 17–20 weeks (4–5 months).** Phases 1–3 overlap slightly with Phase 4 prep.

---

## Phase 0: Foundation

**Goal:** The repo, database, and tooling are ready. A developer can run the V2 web app shell and the Expo skeleton from separate workspace packages against a fresh Neon DB.

**Duration:** 1 week

### Deliverables

**Monorepo structure**
```
roost/
├── apps/
│   ├── web/          ← Next.js 16, App Router (V2 web app)
│   └── mobile/       ← Expo SDK 53 (iOS/Android)
├── packages/
│   ├── api-types/    ← Shared request/response types
│   ├── constants/    ← Colors, limits, section config
│   └── utils/        ← Debt simplification, recurrence, grocery sort, time
├── package.json      ← npm workspaces root
└── .planning/
```

V1 source: leave in place at `src/` temporarily. V2 is built in `apps/web/src/`. Delete V1 source after cutover.

**Database**
- New Neon project + database (separate from V1 production DB)
- Drizzle configured with `drizzle-kit generate` + `drizzle-kit migrate` (NOT db:push)
- `DEV_DATABASE_URL` env var for V2 dev DB; `DATABASE_URL` still points to V1 production
- Initial migration `0000_initial.sql` created from scratch — do NOT copy V1 schema blindly; redesign where needed

**Expo skeleton**
- Expo SDK 53 project in `apps/mobile/`
- EAS Build configured for iOS development build
- `@better-auth/expo` plugin installed and session storage wired to `expo-secure-store`
- Blank home screen with "Roost V2 Mobile" text — proves build works, nothing more

**Shared packages**
- `packages/constants`: `SECTION_COLORS`, `FREE_TIER_LIMITS`, `PREMIUM_LIMITS` (updated for V2)
- `packages/api-types`: empty stubs, filled as routes are built
- `packages/utils`: copy only what's needed — debt simplification, grocery sort, recurrence, relativeTime

**Success criteria**
1. `npm run dev --workspace=apps/web` starts the Next.js dev server with no errors
2. `npm run dev --workspace=apps/mobile` starts the Expo dev server
3. `npx drizzle-kit migrate` runs cleanly against the new Neon DB
4. `packages/constants` is importable from both `apps/web` and `apps/mobile`

---

## Phase 1: Shell + Auth + Onboarding

**Goal:** A new user can sign up, create or join a household, and land on the Today tab shell. The V2 design system is applied across all shell surfaces. The 5-tab navigation is functional on web (desktop + mobile).

**Duration:** 2 weeks

### Design system

Build from scratch — do NOT import V1 component files.

**Tokens (globals.css)**
- `--roost-bg`, `--roost-surface`, `--roost-border`, `--roost-border-bottom`
- `--roost-text-primary`, `--roost-text-secondary`, `--roost-text-muted`
- `--roost-topbar-bg`, `--roost-sidebar-bg` (hardcoded #DC2626)
- Section color CSS vars: `--color-chores`, `--color-grocery`, etc.
- Two themes: `default` (light) and `midnight` (dark) — both free

**Base components** (build these first, use everywhere)
- `SlabCard` — rounded-2xl, 1.5px border all sides, 4px colored bottom border, press animation (translateY 2px)
- `DraggableSheet` — shadcn Sheet (side=bottom) + colored drag handle + desktop centering (680px max)
- `EmptyState` — dashed slab card, section-colored icon box, sassy copy, optional CTA button
- `PageHeader` — title + subtitle + optional badge + action button
- `MemberAvatar` — initials avatar, sm/md/lg sizes
- `AdBannerZone` — fixed-height container (50px), renders AdMob on native, nothing on web, nothing for premium users. This component exists from Day 1 so the layout accounts for it everywhere.

**Navigation shell (web)**
- Desktop (md+): 220px red sidebar with icon+label nav items
- Mobile (<md): bottom tab bar with 5 tabs (Today / Household / Food / Money / More)
- TopBar: household name + weather chip + clock — all via CSS variables, never hardcoded colors
- "More" opens a sheet with: Notes, Reminders, Stats, Settings, Profile, Sign out
- Active state: sidebar uses rgba(255,255,255,0.22) white frost on red background
- No emojis, Lucide icons only

**Auth pages** (rewritten from scratch)
- Split layout login/signup: red left panel (desktop), form right panel on #FFF5F5
- Child login: single centered column, household code + PIN pad
- Slab input style: 1.5px border top/sides, 3px border bottom, white background
- No V1 component files imported

**Onboarding** (rewritten)
- Step 1: Create household OR Join by code (two large slab card options)
- Step 2a (Create): Household name input, single field, submit
- Step 2b (Join): 6-char code input
- Step 3: "Add your household members" — Invite adult / Add child account
  - Child account card has inline explainer: "Child accounts use a PIN instead of a password. Kids see chores and their rewards but not expenses."
  - Child setup: name + 4-digit PIN in one screen
  - Child login instruction shown: "They sign in with [household code] + their PIN"
- Step 4: "You're all set" → Go to Today tab
- Total: under 60 seconds for a solo user, under 90 seconds for a user who adds one child

**Today tab shell**
- Layout: Priority Stack + section labels
- Hero slot: largest card at top (wired with real data in Phase 2)
- Section labels: small colored uppercase text above each group
- Secondary slab tiles below (stubs in Phase 1, data in Phase 2)
- AdBannerZone at bottom of scroll (visible in Phase 1, ad-free in Phase 3)
- Premium users: AdBannerZone renders nothing (zero height, no gap)

**Success criteria**
1. New user completes create-household onboarding in under 60 seconds on web
2. New user can add a child account during onboarding with the PIN explainer visible
3. 5-tab navigation renders correctly on desktop (sidebar) and mobile (bottom bar)
4. Today tab shell loads without errors (data tiles show loading skeletons)
5. Both default and midnight themes apply correctly across all shell surfaces

---

## Phase 2: Daily Use Features

**Goal:** A household can do all daily coordination tasks on web — chores, grocery, meals, and tasks — with the new UX applied to each. The Today tab shows real live data.

**Duration:** 3 weeks

### Household management

- Household settings page: rename, invite code regenerate, transfer admin, danger zone
- Members list: role badges (Admin/Member/Guest/Child), tap to open member sheet
- Member sheet (admin only):
  - Role picker
  - Per-feature master toggles: Expenses / Grocery / Chores / Calendar / Tasks / Notes / Meals / Reminders
  - Each master toggle expands for per-action granularity
  - Child accounts: financial toggles always locked (grayed, lock icon)
  - Quick lock: single action turns off all non-essential permissions
- Invite flow: shareable link with 7-day expiry, household preview landing page
- Guest members: amber badge "Guest · expires in X days"

### Chores (rewritten with V2 gamification)

**List view**
- Chore rows: 64px height, completion circle (unfilled = section-color at 40%, filled = section-color)
- Completing a chore: circle fills with animation, +10 pts label fades up
- Filter row: All / Mine / Assigned / By category

**Streak calendar** (new in V2)
- 7-day dot strip at top of chores page (Mon-Sun)
- Dot states: filled red (all chores done), hollow red ring (today, not yet done), gray (missed day), light gray (future)
- Streak count: "7-day streak" label
- Completing the last chore of the day: dot fills with a small burst animation
- Streak resets at midnight in the user's timezone

**Reward progress bar** (new in V2)
- Shown directly on the chores page when the viewing user has an active reward rule
- Purple section color to differentiate from red
- Shows: rule name, reward description, "5 of 7 days — $5 allowance"
- Admin can create reward rules per child (period, threshold %, reward type)
- Nightly Vercel cron evaluates and creates payouts
- Earned money rewards appear in expense settle-up flow

**Nudge** (new in V2)
- Admin sees per-member completion status on the chores page
- "Nudge" button for any member at zero completions for the day
- Sends push notification on native, in-app banner on web
- Rate limited: once per member per day

**Leaderboard**
- Secondary surface (tap to open sheet)
- Weekly reset, rank badges, points per member
- NOT shown by default — user opts in by tapping

**Chore categories**
- 8 default categories seeded on household creation (Kitchen, Bathroom, etc.)
- Custom categories: premium, admin creates, members can suggest
- Icon picker: 29 Lucide icons

### Grocery

- Shared list with quick-add bar at top
- Smart sort by store section (client-side, no API)
- Check/uncheck with optimistic UI
- "Clear checked" action
- Grocery list readable offline (TanStack Query `networkMode: 'offlineFirst'`)
- Multiple lists: premium, list pill row with scroll indicator

### Meals (collocated with Grocery in Food tab)

**Priority 1 — Grocery integration** (ship in this phase)
- One-tap "Add all to grocery list" from any meal
- Confirmation shows ingredient preview before adding
- Duplicate detection: skip items already on the list
- Works from: meal bank cards, planner slots, suggestions

**Weekly planner**
- Mon-Sun grid, 4 slots per day (breakfast/lunch/dinner/snack)
- Empty slot: dashed slab card, tap to plan
- Filled slot: orange-tinted slab card, tap to view/change/remove
- Desktop: 7-column CSS grid; mobile: vertical day list

**Meal bank**
- CRUD for saved meals (name, category, ingredients, prep time, description)
- Search + category filter

**Suggestions**
- Any member (including children) can suggest a meal with target day + slot
- Voting: upvote/downvote, top suggestion gets trophy badge
- Admin: Add to bank / Add to planner / Reject
- Suggestion cards show target day/slot and ingredients

**Priority 2 — URL recipe import** (ship in this phase if time allows, else Phase 3)
- Paste any recipe URL → scrape title, ingredients, servings, prep time
- User edits before saving to meal bank
- Fallback: manual entry if scrape fails
- Library: `recipe-scraper` or similar npm package (no custom parser needed)

### Tasks

- CRUD for tasks: title, description, assignee, due date, priority
- Groups: Overdue (red label) / Due today / Upcoming / No date / Completed
- Completed section collapsed by default
- Complete with confirmation dialog; uncheck immediately
- Filter: All / Mine / Assigned
- Children can mark tasks complete but not create/edit/delete

### Today tab — wire with real data

All data sources connected:
- Hero slot: overdue items first, then due today, then active reminders
- CHORES section: chores due today with inline completion
- FOOD section: grocery item count + tonight's dinner slot
- MONEY section: net balance (owed/owing)
- CALENDAR section: next event in 48h
- REMINDERS section: active reminders due today

**Success criteria**
1. A household can add, assign, and complete chores with the streak calendar updating correctly
2. A child member sees the reward progress bar on their chores page
3. An admin can quick-lock a member's permissions in a single action
4. Adding a meal's ingredients to the grocery list takes one tap
5. Today tab shows real live data from all connected features

---

## Phase 3: Money + Calendar + Remaining Features

**Goal:** All features are complete on web. Every V2 feature is functional and tested. The Today tab is fully wired.

**Duration:** 3 weeks

### Expenses

- Manual entry with 3 split methods (equal / custom / payer-only)
- Expense categories (10 defaults seeded on household creation)
- Debt simplification algorithm
- Two-sided settle-up flow: claim → confirm or dispute
- Pending claims: amber card, payer can cancel or send reminder (1/24h rate limit)
- Recurring expense templates (weekly/biweekly/monthly/yearly) — admin + premium
- Expense export: CSV and PDF — premium
- **Receipt scanning:**
  - Azure Document Intelligence prebuilt-receipt model
  - Free tier: 75 scans/month per household (hidden counter — user never sees it unless they hit the limit)
  - On hitting cap: "You've used all your receipt scans this month. Scans reset [date]. Upgrade for unlimited."
  - Premium: unlimited
  - Mobile: camera capture; web: file upload
  - Line item editor: editable descriptions + amounts, per-member assignment
- Money tab layout: desktop two-column (balance + settle left, expense list right); mobile chip strip

### Calendar

- Month grid view + Agenda list view (next 60 days)
- Mobile: week strip + inline day events
- Create/edit events: title, date/time, attendees, all-day toggle
- Recurring events: daily/weekly/biweekly/monthly/yearly, end conditions
- Expand-on-fetch architecture (no child rows, no cron — templates expanded at query time)
- Event editing: "All occurrences will be updated" notice for recurring events
- Permission: `calendar.add` per member (off for children by default)

### Notes

- Quick-add bar + masonry grid (columns-1 sm:columns-2 lg:columns-3)
- Free: plain textarea, 1000 char limit
- Premium: Tiptap rich text editor (bold, italic, headings, checklists, code blocks, links)
- View mode: checkboxes interactive in rich text notes (auto-save on change)

### Reminders

- CRUD: title, date+time, frequency, notify type (self / specific members / household)
- Recurring: daily/weekly/monthly/custom days
- Vercel cron fires every 15 minutes, creates reminder_receipts
- In-app banner polls every 60s (web)
- Snoozed state: advances next occurrence without marking complete
- Completing recurring: "Done for now?" dialog showing next occurrence

### Stats (premium)

- Date range presets (7d / 30d / 90d / year / custom)
- 6 stat cards: chores completed, total spent, tasks done, meals planned, grocery items checked, most active member
- Charts via Recharts: chore completions over time, spending by category, task priority breakdown, activity feed breakdown
- Member overview table with completion rate + points

### Superadmin panel (/admin)

- Separate JWT auth (not better-auth sessions)
- User list: search, filters, expandable rows
- Household list: search, Set Premium/Free override
- Charts: signups over time, premium conversion rate
- Promo codes: create (lifetime or time-limited), pause/activate/deactivate
- Test account filter toggle (localStorage persisted)

### Remaining URL recipe import (if deferred from Phase 2)

- Paste recipe URL → `recipe-scraper` npm package
- Edit parsed ingredients before saving
- Manual fallback

**Success criteria**
1. Full expense flow works: add → split → settle up with two-sided confirmation
2. Receipt scanning works on web with the 75/month free cap enforced server-side
3. Calendar recurring events expand correctly for a 3-month date range
4. Premium gate works correctly: free users see appropriate upgrade prompts
5. Superadmin panel can set any household to premium/free

---

## Phase 4: iOS Native (Expo)

**Goal:** All V2 features are accessible in a native iOS app. RevenueCat IAP works. AdMob banners show for free users. Push notifications fire for reminders and chore nudges.

**Duration:** 4–5 weeks

### Navigation

- Expo Router (file-based, same pattern as Next.js App Router)
- Tab bar: 5 tabs matching web (Today / Household / Food / Money / More)
- Stack navigator inside each tab
- Deep linking: Universal Links for invite URLs, push notification taps

### Sheets

- `@gorhom/bottom-sheet` v5 for all content sheets (replaces web DraggableSheet)
- Same colored drag handle, same sheet-first interaction model
- Haptic feedback on sheet open/dismiss and chore completion

### Auth

- `@better-auth/expo` plugin
- Session stored in `expo-secure-store`
- Child PIN login: same 3-step flow as web, adapted for native inputs
- Session tested against production Vercel URL (not local dev)

### Feature screens

Every web feature has a native equivalent. Platform-specific adaptations:
- Grocery list: native swipe-to-delete on items
- Chores: native haptic on completion (not just CSS animation)
- Calendar: native date picker for event creation
- Expenses: receipt scanning via native camera (`expo-image-picker`)
- Notes: Tiptap not available on native — rich text uses a native alternative or falls back to plain textarea with markdown

### Revenue layer

**AdMob (free tier)**
- Banner ad at bottom of every tab (Today, Household, Food, Money)
- Never in: onboarding, auth, checkout/billing, expense settle flow
- Initialized AFTER App Tracking Transparency permission prompt
- Child accounts: non-personalized ads flag always set
- Free users see banner; premium users see nothing (zero height)

**RevenueCat**
- `appUserId` = `householdId` (per-household pricing, all members share)
- Products: Monthly ($5.00), Annual ($39.99 — ~33% discount)
- Entitlement: `premium` maps to `households.subscription_status = 'premium'`
- Webhook → Vercel API route → updates `subscription_status` in DB
- No Stripe references in iOS bundle (Apple Guideline 3.1.1)
- Stripe visible on web only; deep link to web billing page from iOS settings

**Push notifications**
- Expo Push (free)
- Permission: NOT requested during onboarding — deferred to first natural moment:
  - After first chore completed
  - After first reminder added
- Notification types:
  - Chore nudge (admin sends to member)
  - Reminder due
  - Settlement confirmation request
  - Allowance/reward earned
- Push tokens stored per user in DB (`users.push_token`)

### App Tracking Transparency

- Prompt shown before AdMob initializes
- If denied: AdMob still loads with limited ad tracking
- Child accounts: ATT skipped, non-personalized ads always

### EAS Build

- Development build for TestFlight internal testing
- Production build for App Store submission
- Environment: `EXPO_PUBLIC_API_URL` points to Vercel production URL
- No `.env.local` secrets in mobile build

**Success criteria**
1. EAS development build installs on physical iOS device and auth works against production
2. RevenueCat monthly purchase flow completes end-to-end (subscribe → household goes premium → ads disappear)
3. Push notification fires when a reminder is due and the app is backgrounded
4. AdMob banner shows for free users; premium users see no banner and no gap
5. All V2 features accessible from native navigation

---

## Phase 5: Revenue Layer + Launch

**Goal:** Billing is wired on web and mobile. The referral system works. The marketing homepage is live. App Store submission is complete.

**Duration:** 2 weeks

### Stripe billing (web)

- Checkout session → redirect to Stripe → return to `/settings/billing?success=true`
- Webhook handles: `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `payment_failed`
- Cancel flow: `cancel_at_period_end=true` → household stays premium until period end
- Reactivate: removes cancel flag
- Customer Portal for self-service management
- Retention screen before cancel: "Here's what you'll lose"
- Annual option: $39.99/year

### Referral system

Schema additions:
- `referrals` table: `referrer_id`, `referred_user_id`, `referred_at`, `qualified_at` (when they subscribe), `reward_applied_at`

Rules:
- Max 3 qualifying referrals per account (6 free months total)
- Qualified = referred user becomes a paying premium member
- Referrer reward: 2 free months added to premium (or next renewal)
- Referred user reward: current intro discount applied at checkout
- Referral link: `app.roost.com/join?ref=[referrerCode]`
- Settings page: "Referrals" section shows status ("You've referred X paying members · X free months earned")

### Promo codes (intro deal)

- Superadmin creates launch promo code (e.g., 50% off for 3 months)
- Users redeem in Settings > Promotions
- Lifetime codes available for influencers/press
- Duplicate block: same household can't redeem the same code twice

### Marketing homepage redesign

Section order (Story-first, from design spec):
1. Nav (logo + Sign in + Get Started)
2. Hero (logo + slogan finalist + 2 CTAs + "Free to use. No credit card.")
3. Problem ("Your household is running on 4 different apps...")
4. Feature showcase (6–8 alternating rows with real V2 screenshots)
5. Comparison table (Roost vs Splitwise vs Cozi vs OurHome)
6. Personas (Families / Roommates / College)
7. Pricing + solo-dev story
8. FAQ (8 questions minimum)
9. Final CTA
10. Footer

**Copy rules:** No em dashes, no bullet lists in hero/problem, first-person solo-dev story, real screenshots only.

### App Store submission

- App icon: 1024x1024 red #EF4444 background, rooster/house mark, no rounded corners
- Screenshots: 6.7" and 5.5" sizes
- Description: leads with slogan finalist, covers all features, no pricing mentioned in description
- App Store name: search "Roost" for conflicts before submitting — fallback "Roost: Household OS"
- Rating: 4+ (not Kids Category — adult-first positioning preserves AdMob)
- Privacy policy URL required (generate before submission)

**Success criteria**
1. Stripe monthly subscription flow works end-to-end on web
2. A referral link correctly tracks and credits 2 free months when the referred user subscribes
3. Intro promo code can be created in superadmin and redeemed by a new user
4. Homepage loads with all sections on desktop and mobile browser
5. App Store review submission sent (doesn't need to be approved in Phase 5)

---

## Phase 6: Android + Post-Launch

**Goal:** Android app ships. Post-launch bugs are fixed. Recipe URL import is complete if deferred.

**Duration:** 2–4 weeks (mostly configuration delta from iOS)

### Android

- EAS build configured for Android
- Google Play Console account + app listing
- AdMob Android app ID configured
- RevenueCat Android products configured in Play Console
- Push notifications tested on Android (Expo Push handles FCM)
- In-app purchase tested end-to-end on Android
- Google Play submission

### Post-launch priorities

- Bug fixes from App Store / Play Store reviews
- Recipe URL import (if deferred from Phase 2)
- Performance audit: animation jank, slow queries, bundle size
- Grocery offline read validation (real device, airplane mode test)
- Referral system edge cases (concurrent redemptions, expired premium overlap)

---

## Schema Design Notes (Fresh DB)

Start from scratch — do NOT copy V1 schema. Key redesign decisions:

**Use `drizzle-kit generate + migrate` from day one** (not db:push).

**New/changed from V1:**
- `users.push_token` — Expo push token, updated on login
- `referrals` table (new) — tracks referral relationships and reward status
- `chore_streak_calendar` or just use `chore_completions` + compute on read — avoid separate streak table if possible
- `receipt_scan_usage` table — tracks monthly scan count per household (for 75/month cap)
- `reward_rules` + `reward_payouts` — keep from V1, clean up column naming
- Remove `chore_reminders_enabled` from users (unused in V1, don't carry forward)
- Remove `allowance_settings` + `allowance_payouts` (replaced by reward_rules/payouts in V1 — don't include old tables)
- `promo_codes.is_lifetime` boolean — keep from V1

**Schema principles:**
- All tables: `id` (text, CUID2 or UUID), `created_at`, `updated_at`, `deleted_at` (nullable — soft delete)
- All feature tables: `household_id` foreign key (everything is household-scoped)
- Avoid nullable columns where a default makes sense
- JSON columns only for: `ingredients[]`, `splits[]`, `notify_user_ids[]`, `receipt_data` — keep these as typed JSON, document the shape

---

## Environment Variables (V2)

```
# Database (V2 — new Neon project)
DATABASE_URL=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# App
NEXT_PUBLIC_APP_URL=

# Email
RESEND_API_KEY=

# Stripe (web billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_ANNUAL=

# RevenueCat (mobile billing)
REVENUECAT_API_KEY=

# Azure (receipt scanning)
AZURE_DOCUMENT_INTELLIGENCE_KEY=
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=

# Vercel Cron (security)
CRON_SECRET=

# Admin panel
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Expo (mobile push)
EXPO_ACCESS_TOKEN=
```

**Note:** RevenueCat account does not exist yet. Create before Phase 4. Free up to $2.5k MRR.

---

## Open Questions (carry forward from design spec)

| Question | Blocks | Action |
|---|---|---|
| Slogan: "Home, sorted." vs "One App. No Excuses." | Phase 5 homepage | Decide before homepage build |
| Intro deal: exact discount % and duration | Phase 5 billing | Decide before launch |
| Recipe URL scraping: which library? | Phase 2/3 meals | Evaluate `@recipe-scrapers/node` vs custom in Phase 2 |
| App Store name conflict search | Phase 5 submission | Do this early — rename if needed |
| 7-day free trial: yes or no? | Phase 4 RevenueCat | Decide before Phase 4 |
| COPPA: confirm adult-first App Store positioning | Phase 4 AdMob | Confirm before Phase 4 |
| RevenueCat account: not created yet | Phase 4 | Create account, set up products before Phase 4 |
