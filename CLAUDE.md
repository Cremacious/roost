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
- TanStack Query (10s polling, real-time not required)
- Zustand (client state, v5)
- framer-motion (page enter animations, list stagger, whileTap)
- shadcn/ui + Lucide icons (NO emojis anywhere)
- Stripe (web payments) + RevenueCat (iOS/Android billing)
- Google Vision API (receipt OCR)
- Expo Push Notifications (free, iOS + Android)
- Vercel hosting + Vercel Cron (scheduled jobs)
- Resend (transactional email, invites only)
- Open-Meteo (weather, free, no key needed)
- Nunito font (via next/font/google, variable --font-nunito)

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

Child (preset, no finance access ever):
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
1. Web (Next.js): launch first, also mobile browser fallback
2. iOS (Expo): primary mobile target after web
3. Android (Expo): comes nearly free after iOS (~2 weeks extra)
All business logic lives in src/lib/ with zero DOM dependencies
so Expo can reuse it. UI stays in Next.js. Expo calls same API routes.

## Notifications
- Web: in-app banners only
- iOS/Android: Expo Push (free)
- Nagging chore reminders: Vercel cron fires Expo push API
- Push tokens stored per user in DB
- No email notifications (nobody reads them)
- Email used only for: invite links, account verification

## Features: Chores vs Tasks
Chores: recurring household duties (vacuum weekly, dishes daily)
  - Assigned to member, has frequency, resets on schedule
  - Reset time based on assigned person's timezone
  - Completion tracked per person for leaderboard
Tasks: one-off to-dos
  - Fields: name, description, assigned_to, due_date, priority
  - Not recurring, just done or not done

## Features: Grocery Lists
- One default shared list per household
- Premium: multiple named lists (Costco run, Target, etc)
- Optimistic UI for check/uncheck
- Soft delete with auto-purge after 30 days

## Features: Bill Splitting
- Track who owes what, no in-app payments
- Users settle in cash/Venmo themselves
- Debt simplification: if A owes B and B owes C, simplify to A owes C
- Receipt scanning: photo in-app, Google Vision OCR,
  editable line items, manual fallback if scan fails

## Features: Gamification
- Chore leaderboard + streaks per household
- Streak = consecutive days all assigned chores completed
- Missing one day breaks streak
- Leaderboard resets weekly
- Points displayed per member

## Features: Ambient Tablet Mode (premium)
- Fully customizable widgets
- Available widgets: weather, clock, pending chores,
  upcoming calendar events, household activity feed
- Screensaver activates on idle
- Uses Open-Meteo for weather (free, no key)

## Features: Household Lifecycle
- Admin = person who holds the subscription
- If admin cancels: household enters 30-day grace period,
  then deleted if no new admin takes over
- Member can leave anytime
- Admin can remove any member
- Expense history shows "Former Member" for removed users

## Features: Permissions Checklist
- Admin settings has per-user toggle list
- Role presets (Child/Member) auto-apply defaults
- Admin can then fine-tune individual toggles
- Changes take effect immediately server-side

## Features: Onboarding
- New user: create household OR join with code
- Household code is shareable (not email-based)
- Joiner setup: display name, timezone
- Child accounts: PIN set by parent, no email needed

## Features: Internationalization
- English + Spanish at launch
- Build with i18n from day one (next-intl recommended)
- All UI copy goes through translation keys, no hardcoded strings

## Features: Theme System
- Each user has their own saved theme stored in users.theme (DB)
- 8 themes: warm, slate, midnight, forest, rose, sand, lavender, charcoal
  warm = "Warm Linen" (default, light)
  slate = "Slate" (light blue-gray)
  midnight = "Midnight" (dark, dark:true)
  forest = "Forest" (light green)
  rose = "Rose" (light pink)
  sand = "Sand" (light amber)
  lavender = "Lavender" (light purple)
  charcoal = "Charcoal" (dark, dark:true)
- ThemeProvider reads user's theme server-side, applies CSS variables on mount
- useTheme() hook: { theme, setTheme } -- setTheme applies instantly + PATCHes API
- CSS variables: --roost-bg, --roost-surface, --roost-border, --roost-border-bottom,
  --roost-text-primary, --roost-text-secondary, --roost-text-muted,
  --roost-topbar-bg, --roost-topbar-border
- ThemeProvider also overrides shadcn CSS vars (--background, --card, etc.)
  so existing Tailwind classes respond to theme automatically
- SlabCard is the base card for the entire app: rounded-2xl, border + 4px colored bottom
- Settings page (/settings) has a theme picker grid -- changes apply instantly, no save button

## Logo
- Placeholder logo lives in src/components/shared/RoostLogo.tsx
- This is the ONLY place the logo is defined
- All pages import RoostLogo from there, never inline SVG
- To swap: update RoostLogo.tsx only, everything updates
- Final assets go in public/brand/ when ready
- See public/brand/README.md for swap instructions
- App Store icon: 1024x1024, red bg #EF4444, no rounded corners

## Data Rules
- Soft deletes: deleted_at timestamp on all major tables
- Auto-purge: Vercel cron cleans deleted_at > 30 days old
- Timezone: stored per user, used for chore reset scheduling
- Former members: anonymized display, expense history preserved

## Design System
- Theme system provides all background, surface, border, and text colors
- Section colors (fixed, never change -- always import from src/lib/constants/colors.ts):
  chores = #EF4444
  grocery = #F59E0B
  calendar = #3B82F6
  expenses = #22C55E
  meals = #F97316
  notes = #A855F7
  reminders = #06B6D4
  tasks = #EC4899
- Slab card style: rounded-2xl, border 1.5px solid --roost-border on all sides,
  border-bottom 4px solid (section color or --roost-border-bottom). That bottom border is the
  ONLY place the 3D clay effect comes from. No left/right/top border accents ever.
  Active press: translateY(2px) + border-bottom reduces to 2px. Use SlabCard component.
- Touch targets: 48px minimum, 64px for list rows
- No hover-only interactions, touch first
- No emojis anywhere, Lucide icons only
- No em dashes and no double hyphens in any UI-facing text, placeholders,
  copy, or JSX string content. Use commas, colons, periods, or reword instead.
  This applies to ALL files forever.
- Slab design = bottom border only for the 3D effect. No left/right/top border as color accents.
  Section colors appear only in: icon background, icon stroke, badge pills, border-bottom of
  section-specific cards. Never as a left/right stripe or top accent.
- CarPlay-inspired large tile grid on tablet + desktop
- Bottom tab bar on mobile (Home, Chores, Grocery, Calendar, More)
  More opens a sheet with Profile and Settings links
- UI scales: phone / tablet / desktop
- Font: Nunito (400-900) via next/font/google; weights 600/700/800/900 only in UI. Never below 600.
- framer-motion animations:
  - Page wrapper: initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} duration:0.18
  - List stagger: delay: Math.min(index * 0.04, 0.2), duration: 0.15
  - Buttons: whileTap={{ y: 2 }} (cards/FAB) or {{ y: 1 }} (small buttons)
  - Slides: AnimatePresence mode="wait", x: 20 in / x: -20 out

## Empty State Copy (exact wording, section by section)
- Chores (no chores at all): title "Suspiciously clean." / body "No chores yet. Either you are very on top of things, or someone is avoiding this screen." / button "Add the first chore"
- Chores (filtered, none match): title "All clear." / body "Nothing here. Enjoy it while it lasts." (no button)
- Grocery: title "The fridge is on its own." / body "No items on the list. Add something before someone eats a condiment for dinner." / button "Add an item"
- Tasks: title "Nothing to do." / body "Either you are incredibly productive, or you just found this screen. Either way, good job." / button "Add a task"
- Calendar: title "Wide open." / body "No events this week. Either things are calm, or nobody told the app." / button "Add an event"
- Notes: title "Blank slate." / body "No notes yet. Write something down before you forget it." / button "New note"
- Expenses: title "All square." / body "No expenses tracked. Either everyone is being weirdly generous, or nobody has added anything yet." / button "Add expense"
- Meals: title "Dinner TBD." / body "No meals planned. The household is winging it tonight." / button "Plan a meal"
- Reminders: title "Nothing pending." / body "No reminders set. Bold move." / button "Add a reminder"
- Leaderboard (no activity): title "No activity this week yet." / body "Complete chores to earn points and claim your spot."

## Placeholder Copy (exact wording)
- Chore title: "e.g. Vacuum the living room"
- Chore description: "Any extra details for the person doing it"
- Household name: "e.g. The Johnson House"
- Household code: "6-letter code from your housemate"
- Task title: "e.g. Buy a new shower curtain"
- Note title: "Give it a name"
- Note body: "Write whatever you want. Nobody is grading this."
- Grocery item: "Add an item"
- Expense description: "What was it for?"
- Expense amount: "0.00"

## Folder Structure
src/db/schema/              Drizzle schema files, split by domain
src/lib/auth/               better-auth config
src/lib/db/                 Neon client + Drizzle instance
src/lib/utils/              Shared utilities, NO DOM dependencies
src/lib/hooks/              Shared hooks, NO DOM dependencies
src/lib/constants/          App-wide constants (colors, themes)
src/lib/store/              Zustand stores (themeStore, etc.)
src/types/                  TypeScript types and interfaces
src/app/(auth)/             login, signup, child-login
src/app/(app)/              All authenticated routes
src/app/api/                API route handlers
src/components/ui/          shadcn primitives
src/components/layout/      Shell, nav, sidebar
src/components/providers/   Client providers (ThemeProvider)
src/components/dashboard/   Home screen components
src/lib/utils/              Shared utilities, NO DOM dependencies (activity.ts, etc.)
src/components/shared/      Reused across features (SlabCard, QueryProvider, EmptyState, StatCard, PageHeader, SectionColorBadge, MemberAvatar)
src/components/grocery/     Grocery-specific components (GroceryItemSheet, GroceryListSheet)

## Files Built So Far
src/proxy.ts                                   Route protection (Next.js 16 middleware)
src/lib/auth/index.ts                          better-auth server config
src/lib/auth/client.ts                         better-auth client (signIn, signUp, signOut, useSession)
src/lib/auth/helpers.ts                        requireSession, requireHouseholdMember, requireHouseholdAdmin, requirePremium, blockChild
src/lib/constants/colors.ts                    All 8 section colors, always import from here
src/lib/constants/themes.ts                    8 themes: warm, slate, midnight, forest, rose, sand, lavender, charcoal
src/lib/store/themeStore.ts                    Zustand store: { theme, setTheme }
src/lib/db/index.ts                            Neon + Drizzle instance
src/db/schema/auth.ts                          better-auth tables (user, session, account, verification)
src/db/schema/households.ts
src/db/schema/users.ts                         App user table; includes theme column (text, default 'warm')
src/db/schema/members.ts                       household_members, member_permissions
src/db/schema/chores.ts                        chores, chore_completions, chore_streaks
src/db/schema/grocery.ts                       grocery_lists, grocery_items
src/db/schema/tasks.ts
src/db/schema/calendar.ts                      calendar_events, event_attendees
src/db/schema/notes.ts
src/db/schema/expenses.ts                      expenses, expense_splits
src/db/schema/notifications.ts                 notification_queue
src/db/schema/activity.ts                      household_activity table (id, household_id, user_id, type, entity_id, entity_type, description, created_at)
src/db/schema/index.ts                         Re-exports all tables
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx                 Email/password + strength meter + confirm field
src/app/(auth)/child-login/page.tsx            Household code + PIN, 64px inputs
src/app/(app)/layout.tsx                       App shell: TopBar + Sidebar + BottomNav + QueryProvider
src/app/(app)/onboarding/page.tsx              3-step create/join household flow
src/app/(app)/dashboard/page.tsx               Tile grid + activity feed, all CSS variable colors
src/app/(app)/settings/page.tsx                Appearance + Profile sections; 8-theme grid picker
src/app/(app)/chores/page.tsx                  Chores list, summary bar, view toggle, optimistic completion + uncheck
src/app/layout.tsx                             Root layout: Nunito font, ThemeProvider with server-side theme
src/app/globals.css                            Tailwind + shadcn vars + --roost-* CSS variable defaults
src/app/api/auth/[...all]/route.ts             better-auth catch-all handler
src/app/api/auth/child-login/route.ts          PIN auth, creates session via internalAdapter
src/app/api/household/create/route.ts          POST: create household, generate unique code
src/app/api/household/join/route.ts            POST: join by code, premium multi-household check
src/app/api/household/members/route.ts         GET: household info + member list with user data
src/app/api/user/theme/route.ts                PATCH: update users.theme for current user
src/app/api/chores/route.ts                    GET (list with joins) + POST (create); exports getUserHousehold + calcNextDueAt
src/app/api/chores/[id]/route.ts               PATCH (update) + DELETE (soft delete)
src/app/api/chores/[id]/complete/route.ts      POST: complete chore + streak; DELETE: uncheck, reverse streak
src/app/api/chores/leaderboard/route.ts        GET: weekly leaderboard sorted by points
src/app/api/grocery/lists/route.ts             GET: all lists with item counts + isPremium + isAdmin; POST: create list (premium check)
src/app/api/grocery/lists/[id]/route.ts        PATCH: rename (non-default, non-child); DELETE: soft delete (admin, non-default)
src/app/api/grocery/lists/[id]/items/route.ts  GET: all items with user data; POST: add item + log activity
src/app/api/grocery/lists/[id]/clear/route.ts  POST: soft delete all checked items in list
src/app/api/grocery/items/[id]/route.ts        PATCH: check/uncheck + edit name/qty + log check activity; DELETE: soft delete
src/app/api/household/activity/route.ts        GET: last 20 activity items joined with users, ordered by created_at desc
src/components/layout/TopBar.tsx               Household name, weather, clock, avatars -- all CSS variable colors
src/components/layout/BottomNav.tsx            Mobile 4-tab nav + More sheet (Profile, Settings)
src/components/layout/Sidebar.tsx              Desktop 220px sidebar with icon+label for all 9 nav items
src/components/providers/ThemeProvider.tsx     Applies theme CSS vars; exports useTheme() hook
src/components/shared/QueryProvider.tsx        TanStack Query client provider
src/lib/utils/activity.ts                      logActivity(params) helper -- wraps insert, never throws, safe to call from any route
src/lib/utils/time.ts                          relativeTime(date) -- returns "Just now", "Xm ago", "Xh ago", "Yesterday", "Xd ago"
src/components/shared/RoostLogo.tsx            Centralized logo: sizes xs/sm/md/lg/xl, variants dark/light/red
src/components/shared/SlabCard.tsx             Base card: rounded-2xl, border + 4px slab bottom, press effect
src/components/shared/EmptyState.tsx           Sassy empty state: dashed slab card, icon, title, body, optional button
src/components/shared/ErrorState.tsx           Network error state: WifiOff icon, "Something went wrong.", optional "Try again" button (onRetry)
src/components/shared/StatCard.tsx             Stat tile: big number + label, slab card
src/components/shared/PageHeader.tsx           Page title + subtitle + optional badge + action
src/components/shared/SectionColorBadge.tsx    Inline color badge pill: bg color+18, border color+30
src/components/shared/MemberAvatar.tsx         Initials avatar, sizes sm/md/lg, color prop
src/components/chores/ChoreSheet.tsx           Add/edit sheet: slab inputs, slab freq toggles, slab day buttons
src/components/chores/LeaderboardSheet.tsx     Weekly leaderboard: slab cards, gold/silver/bronze rank badges
src/components/grocery/GroceryItemSheet.tsx    Add/edit item sheet: name + quantity slab inputs, amber save button
src/components/grocery/GroceryListSheet.tsx    Create/rename list sheet; shows premium upgrade prompt for free tier
src/app/(app)/grocery/page.tsx                 Full grocery module: list pills, quick add bar, item rows, checked collapsible, amber FAB
src/app/(app)/tasks/page.tsx                   Full tasks module: grouped sections, filter row, stats, optimistic complete/uncheck, delete confirm
src/app/api/tasks/route.ts                     GET (incomplete asc due_date + completed desc) + POST (create + log activity)
src/app/api/tasks/[id]/route.ts                PATCH (edit + complete/uncheck + log completion) + DELETE (creator or admin, soft delete)
src/components/tasks/TaskSheet.tsx             Add/edit task sheet: title, description, assignee select, due date + Clear, priority toggle
src/app/(app)/calendar/page.tsx               Full calendar module: month grid + agenda list, DaySheet, EventSheet
src/app/api/calendar/route.ts                 GET (month events with attendees) + POST (create + permission check + log activity)
src/app/api/calendar/[id]/route.ts            PATCH (edit, creator or admin) + DELETE (soft delete)
src/components/calendar/EventSheet.tsx        Create/edit/view event: inline date picker, all-day toggle, time inputs, attendee chips
src/components/calendar/DaySheet.tsx          Day events list, tap to view/add, pre-fills date in EventSheet
src/app/(app)/notes/page.tsx                  Notes module: quick add bar, masonry CSS columns grid, NoteSheet
src/app/api/notes/route.ts                    GET (newest first, creator join) + POST (1000 char limit, activity log)
src/app/api/notes/[id]/route.ts               PATCH + DELETE (creator or admin, soft delete)
src/components/notes/NoteSheet.tsx            Create/edit/view note: title optional, 1000 char limit, char counter
src/app/(app)/expenses/page.tsx               Expenses module: premium gate with blurred preview, balance summary, debt cards, settle flow
src/app/api/expenses/route.ts                 GET (expenses + splits + debt simplification + myBalance + isPremium) + POST (premium, splits validation)
src/app/api/expenses/[id]/route.ts            PATCH (title/category only, paid_by or admin) + DELETE (soft delete)
src/app/api/expenses/[id]/settle/route.ts     POST: mark single split as settled (payer or admin)
src/app/api/expenses/settle-all/route.ts      POST: settle all unsettled splits between two users
src/components/expenses/ExpenseSheet.tsx      Create/edit/view expense: amount, paid_by, category pills, 3 split methods (equal/custom/payer-only)
src/components/expenses/SettleSheet.tsx       Settle-up confirmation: shows debt summary, two-step confirm, calls settle-all API

## Expense UX Patterns
- Premium-gated: free tier sees blurred mock expense list with upgrade CTA overlay
- Balance summary card shown when myBalance != 0 (green = owed, red = you owe)
- Debt simplification algorithm: net balance per person, greedy creditor/debtor matching
- Settle cards shown for current user's debts only (filtered from all household debts)
- SettleSheet uses two-step confirm before calling settle-all API
- ExpenseSheet: 3 split methods: Equal (auto-divide), Custom (per-member inputs), Just me (payer pays all)
- Amount field is disabled in edit mode (can only edit title and category)
- numeric columns from Drizzle return as strings, always parseFloat() before arithmetic
- paid_by is the creator for permission checks (no separate created_by column on expenses)
- Dashboard expenses tile: statusText is dynamic ("You owe $X" / "Owed $X" / "All settled" / "Premium feature")

## Calendar UX Patterns
- Two views: Month grid (default) and Agenda list (next 60 days from today)
- Month view: tap any day cell to open DaySheet showing that day's events
- Event pills in day cells: blue bg (#3B82F6 at 15%), blue text, 11px, border-bottom slab
- Today cell: date number has filled blue circle
- DaySheet pre-fills the date when opening EventSheet from a specific day cell
- Agenda view: groups events by date with sticky headers (Today/Tomorrow/date)
- Agenda view: fetches current month + 2 ahead to cover 60-day window
- Permission check: calendar.add permission in member_permissions table (default true for members)
- Children blocked from adding/editing/deleting events
- Event color: #3B82F6, border-bottom: #1A5CB5

## Task UX Patterns
- Tasks grouped by: Overdue (red header), Due today (pink), Upcoming, No due date, Completed
- Completed section collapsed by default; all others expanded
- Priority colors: High #EF4444, Medium #F59E0B, Low var(--roost-text-muted)
- Completing a task: AlertDialog confirmation, then optimistic update
- Unchecking a task: immediate optimistic update, no confirmation (undo toast)
- Filter row: All / Mine / Assigned / Completed — active pill has dark fill (roost-text-primary bg)
- Children can mark tasks complete but cannot create, edit, or delete tasks

## API Rules
- All routes validate session + household membership before DB
- Child accounts: financial endpoints always return 403
- Free tier limits checked server-side before writes
- Optimistic UI pattern: cancelQueries -> setQueryData -> return previous -> onError revert -> onSettled invalidate
- Server confirmation required for: expenses, payments, members
- Schema entry point: src/db/schema/index.ts re-exports all tables
- getUserHousehold(userId) helper exported from src/app/api/chores/route.ts, returns { householdId, role }
- calcNextDueAt(frequency, customDays, from?) exported from same file, use for all chore scheduling
- Streaks use week_start (Monday, YYYY-MM-DD) as partition key in chore_streaks table
- Completing a chore: insert chore_completions, update next_due_at, upsert chore_streaks (+10 pts)
- Unchecking a chore: delete today's completion, restore last_completed_at, subtract 10 pts (min 0)
- Activity logging: call logActivity() from src/lib/utils/activity.ts after successful writes
  Activity types live: chore_completed, item_added, item_checked
  Activity types reserved: task_completed, event_added, note_added, expense_added, member_joined
- Dashboard activity feed queries /api/household/activity (last 20, real-time via 10s refetch)
- Grocery lists: GET /api/grocery/lists returns isPremium + isAdmin for conditional UI
- Free tier: max 1 grocery list enforced server-side; GroceryListSheet shows upgrade prompt
- Grocery items: every row shows added_by (avatar + "Added by [first name] · Xh ago").
  Checked rows also show checked_by on the right. API returns added_by_name, added_by_avatar,
  checked_by_name, checked_by_avatar, created_at for all items.
- Quick add bar: Enter key and inline + button both call the same handleQuickAdd() function.
  + button is type="button" with onClick. Input has onKeyDown for Enter. No form element needed.

## Key Rules
- Toasts: use sonner only. Import { toast } from "sonner" in client components.
  Import Toaster from @/components/ui/sonner in root layout. Never use @/components/ui/toast.
- Section colors: always import from src/lib/constants/colors.ts, never hardcode hex values
- Theme colors: always use CSS variables (--roost-bg, --roost-surface, etc.), never hardcode
  background or text colors on any component. Use inline style={{ color: 'var(--roost-text-primary)' }}.
- textMuted (--roost-text-muted): ONLY for timestamps, captions, and helper labels.
  Never for body copy or any text the user needs to read.
- Weather: Open-Meteo free API, no key needed. Hardcoded lat/lon 28.5, -81.4 (Orlando), TODO make dynamic
- Touch targets: 48px minimum everywhere, 64px for list rows
- No emojis anywhere, Lucide icons only
- No em dashes and no double hyphens in any UI-facing text, placeholders, copy, or JSX string content.
  Use commas, colons, periods, or reword instead. This applies to ALL files forever.
- Text opacity: never use opacity below /70 for text. Use --roost-text-muted instead of text-primary/50.
- HIDE_NAV_ROUTES = ['/onboarding']: AppShell hides Sidebar, TopBar, and BottomNav on these routes.
  Add routes here when a page has its own full-screen layout. AppShell also removes the main padding
  offsets (pt-14, pb-16, md:pl-55) on hidden-nav routes.
- Dashboard household guard: always check membersData?.household before rendering dashboard content.
  If household is undefined after data loads, render NoHouseholdState (EmptyState with Home icon,
  redirect to /onboarding). User may land on dashboard without a household during early onboarding.
- Add flow pattern per feature page:
    Grocery: quick add bar at top for fast adds (h-14, amber border, cycling placeholder).
      Top-right + opens GroceryItemSheet for detailed add with name + quantity.
      No FAB on grocery page.
    Chores: FAB opens ChoreSheet (no inline quick-add bar on chores page, FAB is the primary action).
    Other feature pages: only add a FAB if there is no inline quick-add input already on the page.
      Never add a FAB just to duplicate an existing add flow.

## Build Phases
Phase 1: Foundation (COMPLETE)
  Schema: DONE, all tables in src/db/schema/, pushed to Neon
  Auth: DONE, better-auth, email/password + child PIN login
  Household: DONE, create, join by code, onboarding flow
  Middleware: DONE, src/proxy.ts (Next.js 16 renamed middleware to proxy)

Phase 2: Daily Use
  Design system pass: DONE, all auth+app pages, ChoreSheet, LeaderboardSheet, Sidebar (220px), BottomNav (4 tabs + More sheet), shared components
  Theme system: DONE, 8 themes, per-user, instant apply, settings picker
  Chores: DONE, list, create, edit, complete, uncheck, streaks, leaderboard, optimistic UI
  Grocery: DONE, lists (free: 1, premium: multiple), items, check/uncheck optimistic, clear checked, activity logging
  Activity feed: DONE, household_activity table, logged for chores + grocery, dashboard reads real data
  Calendar: DONE, month grid + agenda view, DaySheet, EventSheet, attendees, permissions
  Tasks: DONE, create, assign, due date, priority, complete, grouped sections, filter row
  Notes: DONE, quick add bar, masonry grid, view/edit/delete sheet, 1000 char limit
  Push notification setup (Expo)

Phase 3: Money (premium)
  Expenses: DONE, manual entry, split 3 ways, settle up, debt simplification, premium gate
  Bill splitting: DONE (part of expenses module)
  Receipt scanning: Google Vision, editable line items

Phase 4: Polish
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

## Logo Swap Checklist (when final logo arrives)

When the designer delivers the final logo files, follow
these steps in order:

1. Get these files from the designer:
   roost-icon.svg (icon only, square, no rounded corners)
   roost-wordmark.svg (icon + Roost wordmark together)
   roost-icon-red.svg (red background #EF4444 version)
   roost-appstore.png (1024x1024, red bg, no rounded corners)

2. Drop all files into public/brand/

3. Open src/components/shared/RoostLogo.tsx
   Replace the placeholder SVG paths with next/image
   pointing at the files in public/brand/
   Keep all props (size, variant, showWordmark) working

4. Check every page the logo appears on:
   login, signup, child-login, onboarding,
   TopBar, Sidebar

5. Test all 8 themes -- logo should look right on
   both light and dark theme surfaces

6. Test at all sizes: xs, sm, md, lg, xl

7. Commit with message:
   "brand: swap in final logo assets from designer"

Designer brief (send this when hiring):
  App called Roost. Household management app for
  families and roommates. Red rounded square icon.
  Clean white rooster silhouette sitting on top of a
  simple house outline. Friendly and approachable,
  not realistic or detailed. Must be readable at 20px.
  Nunito 900 wordmark alongside.
  Deliver: SVG + PNG at 1024px for App Store.
  Brand red: #EF4444

## Session Handoff
At the start of each new session fetch this file to restore context.
Share GitHub file URLs, paste code, or describe what was built.
Update this file after every major decision or completed phase.
Last updated: 2026-04-05 (expenses module: API routes, ExpenseSheet, SettleSheet, expenses page, dashboard dynamic tile)

## Bugs Found and Fixed (2026-04-05)
- No default grocery list created on household signup: `GET /api/grocery/lists` now
  auto-creates a "Shopping List" (is_default=true) when the household has no lists.
  Previously new households could never see the quick-add bar because activeListId
  stayed null.
- `household_activity` table missing from Neon DB: schema file existed but
  `npx drizzle-kit push --force` had never been run. logActivity() was silently
  failing. Fixed by running db:push.
- `listsQuery` and `itemsQuery` in grocery/page.tsx used `.then(r => r.json())`
  without checking `r.ok`, so server errors appeared as silent bad data. Both
  now throw on non-OK responses so TanStack Query surfaces them correctly.
- POST body parse catch block in `grocery/lists/[id]/items/route.ts` had no
  console.error. Added for visibility in server logs.

## Code Quality Sweep (2026-04-05)
- Created `ErrorState.tsx`: shared WifiOff error card with optional "Try again" button.
  Used on dashboard, chores, and grocery pages.
- dashboard/page.tsx: added DashboardSkeleton, ErrorState for membersError, fixed query
  config (staleTime/refetchInterval 10s, retry 2), added r.ok checks, fixed activity
  empty state copy, added missing router declaration.
- chores/page.tsx: added r.ok checks to both queryFns, replaced "Loading chores..." text
  with Skeleton rows, added ErrorState, fixed membersData staleTime (60s -> 10s) + retry: 2,
  fixed edit button touch target (h-8 w-8 -> h-12 w-12).
- grocery/page.tsx: replaced Loader2 spinner with Skeleton loading state, added ErrorState
  for listsQuery.isError, fixed empty state copy to match spec, fixed delete button touch
  target (h-10 w-10 -> h-12 w-12), removed unused GroceryItemData import.
- RoostLogo.tsx: replaced hardcoded "#1A1714" in dark/red variants with
  "var(--roost-text-primary)" so wordmark adapts to all 8 themes.


Rules:
- Follow all design rules in CLAUDE.md
- No emojis, use Lucide icons
- Use sonner for all toasts (never @/components/ui/toast)
- Touch targets 48px minimum
- All components must use CSS variable colors, never hardcode background or text colors
- Confirm when done and list files changed
