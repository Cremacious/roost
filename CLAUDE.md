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

## Brand Voice
App slogan options (decision pending):
  Leading candidate: "Home, sorted."
  Runner up: "Get your house in order."
  
  Slogan should appear on:
    Login page below the logo
    App Store description first line
    Marketing/landing page hero
    Onboarding welcome screen

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
- 2 themes only: default, midnight (both free, no premium gate)
  default = "Default" (clean neutral light: bg #F9FAFB, surface #FFFFFF, borders #E5E7EB)
  midnight = "Midnight" (soft dark gray: bg #111827, surface #1F2937, dark:true)
- Red appears ONLY in: chores feature, brand/logo, destructive actions (delete, sign out),
  auth page left panel, upgrade/billing CTAs, homepage hero. Nowhere else.
- Sidebar active state: light gray fill (#F3F4F6) with dark text (#111827) on default.
  No red in sidebar active state.
- ThemeProvider reads user's theme server-side, applies CSS variables on mount
- ThemeProvider accepts string for initialTheme; any unknown key (forest/slate/sand/warm/etc.)
  resolves to DEFAULT_THEME ('default')
- useTheme() hook: { theme, setTheme } -- setTheme applies instantly + PATCHes API
- CSS variables: --roost-bg, --roost-surface, --roost-border, --roost-border-bottom,
  --roost-text-primary, --roost-text-secondary, --roost-text-muted,
  --roost-topbar-bg, --roost-topbar-border,
  --roost-sidebar-bg, --roost-sidebar-border, --roost-sidebar-active-bg,
  --roost-sidebar-active-text, --roost-sidebar-inactive-text, --roost-sidebar-divider,
  --roost-weather-bg, --roost-weather-color
- ThemeProvider sets data-theme and data-dark attributes on <html> element
- ThemeProvider also overrides shadcn CSS vars (--background, --card, etc.)
  and sets --primary: near-black (light) or near-white (dark) — NOT red.
  This makes Switch, Checkbox, and other shadcn components use neutral color when active.
- SlabCard is the base card for the entire app: rounded-2xl, border + 4px colored bottom
- Settings page (/settings) has a theme picker grid (2 cards) -- changes apply instantly, no save button
- Selected theme card: border 2px solid #EF4444, border-bottom 4px solid #C93B3B
  (brand red selection indicator is a meta-UI element, acceptable here)

## Brand Guidelines
- Primary brand color: #EF4444 (Roost Red)
- Primary dark: #C93B3B
- Brand red used for: chores section color, bottom nav Home/Chores active, primary CTA buttons,
  "See all" links, selected theme card border, destructive actions, auth page left panel,
  upgrade/billing CTAs, homepage hero. NOT used for sidebar active state or shadcn --primary.
- Section colors unchanged (chores, grocery, calendar, expenses, meals, notes, reminders, tasks)
- Date subheading on dashboard always uses #9B9590 hardcoded — never tinted by theme
- TopBar: household name + weather chip + time only. No user avatars.
- Sidebar: brand red active state (all items). User name + role + MemberAvatar at bottom.
  No user avatar in TopBar. Sidebar reads user session + role via useSession() + useHousehold() directly.
- BottomNav: Home active = #EF4444, Chores active = #EF4444, Grocery = #F59E0B, Calendar = #3B82F6

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
- households.subscription_status: 'free' | 'premium', default 'free'.
  This is the single source of truth for premium status. Never check
  premium status anywhere except by reading this column.
  requirePremium() in helpers.ts is the server-side gate.
  useHousehold().isPremium is the client-side gate.
- Always run npm run db:push after any schema change to sync Neon.
  No migration files used; db:push is the only migration path.

## Design System
- Theme system provides all background, surface, border, and text colors
- Section colors (fixed, never change -- always import from src/lib/constants/colors.ts):
  chores = #EF4444 / dark #C93B3B
  grocery = #F59E0B / dark #C87D00
  calendar = #3B82F6 / dark #1A5CB5
  expenses = #22C55E / dark #159040
  meals = #F97316 / dark #C4581A
  notes = #A855F7 / dark #7C28C8
  reminders = #06B6D4 / dark #0891B2
  tasks = #EC4899 / dark #B02878

## Section Color Ownership Rule (overrides ALL previous color rules)
  Each feature page owns its section color completely. Apply section color to:
    Buttons (primary, save, FAB, action buttons)
    Active filter/toggle pills (bg = section color, text = white)
    Completion circles and checkboxes (filled = section color, unfilled = section color at 40%)
    Badges and count pills
    Input focus border + focus border-bottom
    Sheet drag handle
    Card border-bottom for feature-specific cards
    Empty state icon box border-bottom
    Section headers (color, not just muted text)
  Theme CSS vars apply ONLY to:
    Page background (var(--roost-bg))
    Card/surface background (var(--roost-surface))
    Card border top/left/right (var(--roost-border))
    Neutral card border-bottom (var(--roost-border-bottom)) -- for dashboard tiles + non-feature cards
    Text colors (var(--roost-text-*))
    Sidebar, topbar, dividers
  NEVER use var(--roost-border-bottom) on feature-specific interactive elements.
  NEVER let brand red (#EF4444) appear on non-chores/non-settings pages except sidebar active nav.
  Dashboard tiles are neutral containers: border-bottom = var(--roost-border-bottom).
  Dashboard "See all" and activity links: #EF4444 brand red.
  Calendar nav arrows: simple rounded-full, no slab style (NO borderBottom slab effect).
  Calendar month grid container: border: 1.5px solid #BAD3F7, borderBottom: 4px solid #1A5CB5.
  Calendar empty state (EmptyState): pass containerBorderColor="rgba(59,130,246,0.4)" for uniform blue dashed border.
  Calendar DaySheet empty state button: border: 2px dashed rgba(59,130,246,0.4) uniform all sides.
  EventSheet calendars (mobile + desktop): set --primary: #3B82F6 on the wrapper so today/selected circle is blue.
  EmptyState containerBorderColor prop: when provided, overrides container to uniform 2px dashed with that color (no separate borderBottom).
  Month/Agenda toggle: border: 1.5px solid #BAD3F7, borderBottom: 3px solid #1A5CB5. Inactive button text: #304050. Divider: 1px solid #BAD3F7.
  All day Switch: wrapped in div with style={{ "--primary": COLOR }} to override shadcn --primary from brand red to calendar blue.
  Form labels in ALL feature sheets: hardcoded #374151 (neutral dark gray), never var(--roost-text-muted) or var(--roost-text-secondary). Applies to EventSheet, ExpenseSheet, TaskSheet, NoteSheet, ReminderSheet (and any sheet with <label> elements). fontWeight: 700.
  PageHeader badge: pass color={SECTION_COLOR} prop so badge uses section color, not theme color.

## Empty State Rules (overrides all previous empty state styling)
  Container: backgroundColor: "var(--roost-surface)", border: "2px dashed var(--roost-border)",
    borderBottom: "4px dashed var(--roost-border-bottom)" (neutral bottom, no section color)
  Icon box: backgroundColor: "var(--roost-surface)", border: "1.5px solid var(--roost-border)",
    borderBottom: "4px solid ${sectionColor}" (THIS is where section color appears)
  Button: section color slab (bg = section color, borderBottom = dark shade)
  EmptyState component always receives color={SECTION_COLOR} prop; the color prop
    controls ONLY the icon fill and icon box border-bottom.

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
  Section colors appear in: buttons, toggles, input focus, badges, completion states,
  FABs, drag handles, empty state icon box border-bottom. Never as a left/right/top accent.
- PageContainer component (src/components/layout/PageContainer.tsx): max-w-4xl (896px) centered
  on desktop, full width on mobile. All pages wrap their content in PageContainer.
  Exception: Calendar uses an inline div with max-w-5xl (1024px) for the 7-column grid.
  Dashboard: tiles grid (2 cols mobile, 4 cols desktop) + activity feed stacked vertically.
  Activity feed on dashboard: max 5 items, "See all" links to /activity.
  Activity page (/activity): full feed with "Load more" pagination, 20 items per page.
  Notes: masonry grid columns-1 sm:columns-2 lg:columns-3 inside PageContainer.
- CarPlay-inspired large tile grid on tablet + desktop
- Bottom tab bar on mobile (Home, Chores, Grocery, Calendar, More)
  More opens a sheet with Profile and Settings links
- Sheet Rules (ALL sheets in the app):
  Mobile: full width, slides from bottom, rounded-t-2xl top corners only
  Desktop (sm:): 680px max-width, centered — done via globals.css, NOT via individual classNames
  Centering is applied globally in globals.css:
    @media (min-width: 640px) { [data-slot="sheet-content"][data-side="bottom"] {
      left: 50%; right: auto; width: 100%; max-width: 680px;
      transform: translateX(-50%); border-radius: 16px 16px 0 0; } }
  Do NOT add sm:left-* or sm:translate-x-* to individual SheetContent classNames — handled globally
  Never make sheets wider than 680px on desktop
  EventSheet exception: uses sm:grid-cols-[1fr_240px] two-column grid within the 680px;
    form fields on left (1fr), calendar on right (240px fixed)
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
src/lib/constants/themes.ts                    2 themes: default (neutral light), midnight (dark). Both free.
src/lib/store/themeStore.ts                    Zustand store: { theme, setTheme }
src/lib/db/index.ts                            Neon + Drizzle instance
src/db/schema/auth.ts                          better-auth tables (user, session, account, verification)
src/db/schema/households.ts
src/db/schema/users.ts                         App user table; includes theme, latitude, longitude, temperature_unit, chore_reminders_enabled columns
src/db/schema/members.ts                       household_members, member_permissions
src/db/schema/chores.ts                        chores, chore_completions, chore_streaks
src/db/schema/grocery.ts                       grocery_lists, grocery_items
src/db/schema/tasks.ts
src/db/schema/calendar.ts                      calendar_events, event_attendees
src/db/schema/notes.ts
src/db/schema/expenses.ts                      expenses, expense_splits
src/db/schema/notifications.ts                 notification_queue
src/db/schema/activity.ts                      household_activity table (id, household_id, user_id, type, entity_id, entity_type, description, created_at)
src/db/schema/allowances.ts                    allowance_settings + allowance_payouts tables. Payouts have unique (household_id, user_id, week_start)
src/db/schema/index.ts                         Re-exports all tables
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx                 Email/password + strength meter + confirm field
src/app/(auth)/child-login/page.tsx            Household code + PIN, 64px inputs
src/app/(app)/layout.tsx                       App shell: TopBar + Sidebar + BottomNav + QueryProvider
src/app/(app)/onboarding/page.tsx              3-step create/join household flow
src/app/(app)/dashboard/page.tsx               Tile grid + activity feed, all CSS variable colors
src/app/(app)/settings/page.tsx                Full settings page: Profile, Appearance, Preferences, Household, Members (admin), Notifications, Billing, Danger Zone (admin)
src/app/(app)/chores/page.tsx                  Chores list, summary bar, view toggle, optimistic completion + uncheck
src/app/layout.tsx                             Root layout: Nunito font, ThemeProvider with server-side theme
src/app/globals.css                            Tailwind + shadcn vars + --roost-* CSS variable defaults
src/app/api/auth/[...all]/route.ts             better-auth catch-all handler
src/app/api/auth/child-login/route.ts          PIN auth, creates session via internalAdapter
src/app/api/household/create/route.ts          POST: create household, generate unique code
src/app/api/household/join/route.ts            POST: join by code, premium multi-household check
src/app/api/household/members/route.ts         GET: household info + member list with user data (includes email)
src/app/api/household/members/[id]/route.ts    DELETE: remove member (admin only, cannot remove admin or self)
src/app/api/household/members/[id]/role/route.ts  PATCH: change member role; child role locks all child-locked permissions
src/app/api/household/members/[id]/permissions/route.ts  GET + PATCH: 12 permission toggles; child-locked perms cannot be enabled for child role
src/app/api/household/members/[id]/pin/route.ts  PATCH (admin only): set/change child PIN, hashed before storage
src/app/api/household/members/[id]/allowance/route.ts  GET + PATCH (admin only): allowance settings per child member
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
src/app/api/household/activity/route.ts        GET: activity items with pagination (limit/offset params), returns { activity, total, hasMore }
src/components/layout/TopBar.tsx               Household name, weather, clock, avatars -- all CSS variable colors
src/components/layout/BottomNav.tsx            Mobile 4-tab nav + More sheet (Profile, Settings, Sign out with AlertDialog confirm)
src/components/layout/Sidebar.tsx              Desktop 220px sidebar with icon+label for all 9 nav items; sign out button at bottom with AlertDialog confirm
src/components/providers/ThemeProvider.tsx     Applies theme CSS vars; exports useTheme() hook
src/components/shared/QueryProvider.tsx        TanStack Query client provider
src/lib/utils/activity.ts                      logActivity(params) helper -- wraps insert, never throws, safe to call from any route
src/lib/utils/time.ts                          relativeTime(date) -- returns "Just now", "Xm ago", "Xh ago", "Yesterday", "Xd ago"
src/lib/hooks/useHousehold.ts                  Client hook: returns { household, role, permissions, isPremium, isLoading, error } via /api/household/me
src/lib/hooks/useUserPreferences.ts            Client hook: returns { temperatureUnit, latitude, longitude, updatePreferences } via /api/user/preferences
src/app/api/user/preferences/route.ts          GET + PATCH: temperature_unit, latitude, longitude, timezone, language, chore_reminders_enabled
src/app/api/user/profile/route.ts              GET + PATCH: name, email (unique check), avatar_color, timezone, language, push_token
src/app/api/user/change-password/route.ts      POST: verifyPassword current via account table, hashPassword new; strength validation
src/app/api/household/[id]/route.ts            PATCH: rename household (admin); DELETE: hard delete all content + household
src/app/api/household/[id]/delete-data/route.ts  POST (admin only): hard delete all household content in FK order, household row remains
src/app/api/household/[id]/regenerate-code/route.ts  POST (admin only): generates new unique 6-char invite code
src/app/api/household/[id]/transfer-admin/route.ts  POST (admin only): demotes self to member, promotes target to admin (not child)
src/components/shared/RoostLogo.tsx            Centralized logo: sizes xs/sm/md/lg/xl, variants dark/light/red
src/components/shared/SlabCard.tsx             Base card: rounded-2xl, border + 4px slab bottom, press effect
src/components/shared/EmptyState.tsx           Sassy empty state: dashed slab card, icon, title, body, optional button
src/components/shared/ErrorState.tsx           Network error state: WifiOff icon, "Something went wrong.", optional "Try again" button (onRetry)
src/components/shared/StatCard.tsx             Stat tile: big number + label, slab card
src/components/shared/PageHeader.tsx           Page title + subtitle + optional badge + action
src/components/shared/SectionColorBadge.tsx    Inline color badge pill: bg color+18, border color+30
src/components/shared/MemberAvatar.tsx         Initials avatar, sizes sm/md/lg, color prop
src/components/shared/PremiumGate.tsx          Premium upgrade prompt: icon, copy, price card, upgrade button, blurred feature preview
src/components/shared/UpgradePrompt.tsx        In-sheet upgrade prompt: maps 16+ error codes to icon/title/body, "Upgrade for $3/month" link, optional dismiss
src/components/settings/MemberSheet.tsx        Admin member management: role picker, 12 permission toggles, child PIN change, allowance config, remove member
src/components/dev/DevTools.tsx                Dev-only floating toolbar: premium toggle switch, user info, household info
src/lib/constants/freeTierLimits.ts            FREE_TIER_LIMITS: members(5), children(1), chores(5), tasks(10), calendarEventsPerMonth(20), notes(10), activeSingleReminders(5), mealBank(5), groceryLists(1)
src/lib/utils/premiumGating.ts                 Server-side limit checkers: checkChoreLimit, checkTaskLimit, checkNoteLimit, checkCalendarEventLimit, checkReminderLimit, checkMealBankLimit, checkMemberLimit
src/components/chores/ChoreSheet.tsx           Add/edit sheet: slab inputs, slab freq toggles, slab day buttons; isPremium + onUpgradeRequired props; Lock icon on premium-only freqs
src/components/chores/LeaderboardSheet.tsx     Weekly leaderboard: slab cards, gold/silver/bronze rank badges
src/components/grocery/GroceryItemSheet.tsx    Add/edit item sheet: name + quantity slab inputs, amber save button
src/components/grocery/GroceryListSheet.tsx    Create/rename list sheet; shows premium upgrade prompt for free tier
src/app/(app)/grocery/page.tsx                 Full grocery module: list pills, quick add bar, item rows, checked collapsible, amber FAB
src/app/(app)/tasks/page.tsx                   Full tasks module: grouped sections, filter row, stats, optimistic complete/uncheck, delete confirm
src/app/api/tasks/route.ts                     GET (incomplete asc due_date + completed desc) + POST (create + log activity)
src/app/api/tasks/[id]/route.ts                PATCH (edit + complete/uncheck + log completion) + DELETE (creator or admin, soft delete)
src/components/tasks/TaskSheet.tsx             Add/edit task sheet: title, description, assignee select, due date + Clear, priority toggle; onUpgradeRequired prop
src/app/(app)/calendar/page.tsx               Full calendar module: month grid + agenda list, DaySheet, EventSheet
src/app/api/calendar/route.ts                 GET (month events with attendees) + POST (create + permission check + log activity)
src/app/api/calendar/[id]/route.ts            PATCH (edit, creator or admin) + DELETE (soft delete)
src/components/calendar/EventSheet.tsx        Create/edit/view event: inline date picker, all-day toggle, time inputs, attendee chips; onUpgradeRequired prop
src/components/calendar/DaySheet.tsx          Day events list, tap to view/add, pre-fills date in EventSheet
src/app/(app)/notes/page.tsx                  Notes module: quick add bar, masonry CSS columns grid, NoteSheet
src/app/api/notes/route.ts                    GET (newest first, creator join) + POST (1000 char limit, activity log)
src/app/api/notes/[id]/route.ts               PATCH + DELETE (creator or admin, soft delete)
src/components/notes/NoteSheet.tsx            Create/edit/view note: title optional, 1000 char limit, char counter; onUpgradeRequired prop
src/app/(app)/expenses/page.tsx               Expenses module: inline upgrade pitch for free users (no blurred preview), balance summary, debt cards, settle flow
src/app/api/expenses/route.ts                 GET (expenses + splits + debt simplification + myBalance + isPremium) + POST (premium, splits validation)
src/app/api/expenses/[id]/route.ts            PATCH (title/category only, paid_by or admin) + DELETE (soft delete)
src/app/api/expenses/[id]/settle/route.ts     POST: mark single split as settled (payer or admin)
src/app/api/expenses/settle-all/route.ts      POST: settle all unsettled splits between two users
src/components/expenses/ExpenseSheet.tsx      Create/edit/view expense: amount, paid_by, category pills, 3 split methods (equal/custom/payer-only)
src/components/expenses/SettleSheet.tsx       Settle-up confirmation: shows debt summary, two-step confirm, calls settle-all API
src/components/expenses/MockExpensesPreview.tsx  Static non-functional expenses preview used in PremiumGate blurred background
src/app/api/household/me/route.ts             GET: current user's household + role + permissions (most recently joined)
src/app/api/dev/toggle-premium/route.ts       POST: dev-only, toggles household subscription_status between free and premium
src/db/schema/meals.ts                        meals, meal_plan_slots, meal_suggestions, meal_suggestion_votes
src/app/api/meals/route.ts                    GET (meal bank list, ordered by name) + POST (create meal, blockChild)
src/app/api/meals/[id]/route.ts               PATCH (edit, creator or admin) + DELETE (soft delete)
src/app/api/meals/[id]/add-to-grocery/route.ts  POST: push meal ingredients to default grocery list + activity log
src/app/api/meals/planner/route.ts            GET (week slots, ?weekStart=YYYY-MM-DD, joins meals+users) + POST (upsert via onConflictDoUpdate)
src/app/api/meals/planner/[id]/route.ts       DELETE: hard delete slot (creator or admin)
src/app/api/meals/suggestions/route.ts        GET (pending, vote counts, userVote, sorted by upvotes) + POST (all roles including children)
src/app/api/meals/suggestions/[id]/vote/route.ts  POST: toggle up/down vote (same vote = remove)
src/app/api/meals/suggestions/[id]/approve/route.ts  POST: admin only, sets status=approved, optionally inserts into meals bank
src/components/meals/MealSheet.tsx            Create/edit meal: name, category pills, description, prep time, dynamic ingredients list; onUpgradeRequired prop
src/components/meals/MealSlotSheet.tsx        Slot picker: menu mode, bank search, quick add, date-pick mode (preSelectedMeal prop), view/remove existing slot
src/components/meals/SuggestionSheet.tsx      Suggest a meal: name, category pills, note, prep time, dynamic ingredients list (all roles); onUpgradeRequired prop
src/app/(app)/meals/page.tsx                  Full meals module: Planner/Meal Bank/Suggestions tabs
src/db/schema/reminders.ts                    reminders + reminder_receipts tables (frequency, notify_type, next_remind_at)
src/app/api/reminders/route.ts                GET (filtered by notify_type + user) + POST (create + receipts + activity log)
src/app/api/reminders/[id]/route.ts           PATCH + DELETE (creator or admin, soft delete, recalculates next_remind_at)
src/app/api/reminders/[id]/complete/route.ts  POST: complete (once) or advance (recurring); DELETE: undo one-time only
src/app/api/reminders/[id]/seen/route.ts      POST: upsert reminder_receipt seen=true for current user
src/app/api/reminders/due/route.ts            GET: reminders due in next 24h for current user (used by banner + dashboard)
src/app/api/cron/reminders/route.ts           Vercel cron GET (every 15min): process due reminders, create receipts, advance recurring
src/app/(app)/reminders/page.tsx              Full reminders module: grouped sections (overdue/today/week/later/done), filter, stats
src/components/reminders/ReminderSheet.tsx    Create/edit: title, note, date+time picker, frequency + custom days, notify type + member list; onUpgradeRequired prop
src/components/shared/ReminderBanner.tsx      Dismissible banner below TopBar when reminders due (polls every 60s, session-dismissed)
vercel.json                                   Cron schedule: /api/cron/reminders every 15 minutes
src/components/layout/PageContainer.tsx        Content width constraint: max-w-4xl (896px) centered, full width mobile
src/app/(app)/activity/page.tsx               Full activity feed: paginated list, 20 per page, Load more button
src/app/api/allowances/route.ts               GET: payout history for household, optional ?userId filter
src/app/api/allowances/child/route.ts         GET: allowance settings + payouts + current week progress for current user
src/app/api/cron/allowances/route.ts          Vercel cron GET (Sunday 11pm UTC): evaluate chore completion, create expense entries
src/components/shared/AllowanceWidget.tsx     Child-only widget: weekly progress bar, status message, last 4 weeks history
src/lib/utils/googleVision.ts               parseReceiptImage(base64) calls Vision TEXT_DETECTION, returns ParsedReceipt
src/lib/utils/imageUpload.ts                fileToBase64(File), validateReceiptImage(File) client-side helpers
src/app/api/expenses/scan/route.ts          POST: premium + non-child only, accepts { imageBase64 }, returns { receipt: ParsedReceipt }
src/components/expenses/ReceiptScanner.tsx  Scan flow UI: idle (camera + upload buttons), scanning (animated), error (retry)
src/components/expenses/LineItemEditor.tsx  Edit scanned line items, assign per member or split equally, confirm to pre-fill form
src/app/page.tsx                              Public marketing homepage (server component, no app shell). Sections: Nav, mobile teaser bar, hero, problem, 6 alternating feature rows (Chores/Grocery/Calendar/Expenses/Reminders/Meals each with realistic UI mockup), comparison table vs Splitwise/Cozi, personas (3 cards), bottom CTA, footer. No pricing section. Red nav and footer, warm-tinted feature sections, no dark sections. Mobile responsive via CSS class + <style> media queries at 640px: nav hides Features link, feature rows stack vertically with mockup centered, comparison table 16px padding, personas 1 col, all sections reduce padding to ~48px 20px, footer stacks vertically.
src/app/(auth)/login/page.tsx                 Split layout: red left panel (desktop), form right panel; slab inputs on #FFF5F5
src/app/(auth)/signup/page.tsx                Split layout matching login; all validation logic preserved
src/app/(auth)/child-login/page.tsx           Single centered column on #FFF5F5; styled PIN pad with red dots
src/lib/utils/stripe.ts                       Stripe client + STRIPE_PRICE_ID + APP_URL exports
src/app/api/stripe/checkout/route.ts          POST: create Stripe Checkout session (admin only)
src/app/api/stripe/webhook/route.ts           POST (raw body): handles Stripe events, updates subscription_status
src/app/api/stripe/cancel/route.ts            POST: cancel_at_period_end=true (admin only)
src/app/api/stripe/reactivate/route.ts        POST: remove cancel_at_period_end (admin only)
src/app/api/stripe/portal/route.ts            POST: create Stripe Customer Portal session (admin only)
src/app/(app)/settings/billing/page.tsx       Full billing page: free/premium/cancelling states, retention cancel sheet
src/app/api/cron/subscription/route.ts        Daily cron: expire premium households past premium_expires_at

## Reminders UX Patterns
- Reminder types: once (completes after firing) and recurring (daily/weekly/monthly/custom)
- Notify types: self (only creator), specific (chosen members), household (everyone)
- notify_user_ids stored as JSON string in DB
- next_remind_at is the next fire time; remind_at is the original time set by user
- One-time reminders: completing sets completed = true permanently
- Recurring reminders: NEVER set completed = true. Completing sets snoozed_until = nextRemindAt
  and advances next_remind_at. Undo clears snoozed_until and restores next_remind_at to remind_at.
- Snoozed state: !completed && snoozed_until IS NOT NULL && snoozed_until > now()
- Snoozed rows: var(--roost-bg) background, dimmed text, Clock icon (cyan filled),
  "Resets in X days" caption, Undo button (cyan text, no confirmation)
- Completing recurring: shows "Done for now?" dialog with next occurrence date before confirming
- Completing one-time: shows simple "Mark as done?" dialog
- Snoozed section: collapsed by default, between Later and Completed sections in list
- Stats (active count) exclude snoozed reminders
- In-app banner polls /api/reminders/due every 60 seconds
- Banner dismisses per-session via sessionStorage key "roost-reminder-banner-dismissed"
- Cron job runs every 15 minutes on Vercel, secured with CRON_SECRET env var
- Cron creates reminder_receipts (seen=false) for all notified users when reminder fires
- Push notifications: TODO when Expo app is built (push_token on users table)
- Dashboard reminders tile: dynamic statusText "X due today" or "Nothing due today"
- vercel.json created with cron schedule at root of project
- calcNextRemindAt() helper exported from src/app/api/reminders/route.ts
- Snooze base date: Math.max(next_remind_at, now()) + frequency duration. This prevents
  past-date snooze values when a reminder is overdue. Used in both calcNextRemindAt()
  (server) and calcNextSnoozeDate() (client, reminders/page.tsx).
- snoozed_until is the single source of truth for snoozed state on the frontend.
  Never use next_remind_at to determine snoozed state. isSnoozed() checks snoozed_until only.
- GET /api/reminders select must include snoozed_until or isSnoozed() breaks on refetch.

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
- EventSheet create/edit: mobile = single column (calendar inline, collapses after date pick); desktop (sm:) = two-column grid, left col has all form fields, right col has always-visible Calendar using `.roost-calendar-compact`
- EventSheet SheetContent: `sm:rounded-2xl sm:max-w-215 sm:w-215` (860px) for desktop two-column layout
- Desktop right column calendar: fills the 260px fixed column (w-full, classNames root w-full), no maxWidth constraint
- `.roost-calendar-compact` in globals.css: sets `--cell-size: 30px`, `width: 100%`, `max-width: 100%`; targets `.rdp-weekday`, `.rdp-day`, `.rdp-day_button`

## Meal UX Patterns
- Three tabs: Planner, Meal Bank, Suggestions
- Meals section color: #F97316 (orange), slab border-bottom: #C4581A
- Weekly planner: Mon-Sun grid, 4 slots per day (breakfast, lunch, dinner, snack)
  Week navigation: prev/next arrows + "This week" jump button
  Empty slot: dashed slab card, tap opens MealSlotSheet
  Filled slot: orange-tinted slab card, tap opens MealSlotSheet (view/remove/change)
  Desktop: horizontal scroll with minWidth 980px, each day column flex-1
  MealSlotSheet: menu mode (pick bank / quick add), bank search mode, quick add mode, date mode
  "Add to planner" from the meal bank opens MealSlotSheet in date mode (preSelectedMeal prop set)
  Date mode: shows 7-day picker (Mon-Sun of current week) + slot type pills, then saves directly
  Day labels: "Today", "Tomorrow", or short weekday (Mon/Tue/etc); dot indicator if slot filled
  Toast: "Added to {weekday} {slot label}" using the chosen date + slot type
  Edit mode (existing slot): title is "Change meal", shows "Currently: [meal name]" in muted text
  Edit menu shows same two options as create: pick from bank OR quick add
  Quick add in edit mode upserts via POST (unique constraint replaces existing slot, no API change)
  Remove from plan button always visible in edit mode (ghost style, red, Trash2 icon)
  Remove requires AlertDialog confirmation: "Remove from plan?" with meal name and day/slot in description
- Meal Bank: searchable, filterable by category (All/Breakfast/Lunch/Dinner/Snack)
  Meal cards: name, category badge, prep time, ingredient count, description truncated
  Actions: "Add to planner" (opens slot picker), grocery cart icon (pushes ingredients), edit icon
  Ingredients stored as JSON array in meals.ingredients text column
- Suggestions: ranked by upvotes desc, anyone including children can suggest
  Top suggestion (i=0, upvotes>0) gets Trophy badge
  Voting: optimistic UI, same vote = toggle off, up = orange, down = muted red
  Admin sees "Add to bank" button on each suggestion; tapping opens confirmation Dialog
  Approve confirm Dialog: shows meal name bold, description, orange "Add to bank" button
  SuggestionSheet collects: meal name, category (Breakfast/Lunch/Dinner/Snack pills), note,
    prep time (optional), dynamic ingredients list (start with 2 inputs, +Add/X buttons)
  Submits category + prep_time + ingredients so the bank entry is complete when approved
  Approving a suggestion invalidates BOTH ["suggestions"] AND ["meals"] query keys
- Grocery integration: POST /api/meals/[id]/add-to-grocery inserts each ingredient
  as a grocery_item in the default grocery list
  Grocery add requires confirmation Dialog: shows meal name bold, ingredient preview (up to 5
    items with "+ X more"), green "Add to list" button
- Activity types: meal_planned, meal_suggested (both map to 'meals' section color in dashboard)
- Dashboard meals tile: shows "Tonight: [meal name]" or "Nothing planned tonight"
  via a separate planner-tonight query against /api/meals/planner
- meal_plan_slots has unique constraint on (household_id, slot_date, slot_type)
  Upsert uses .onConflictDoUpdate() — planning same slot replaces the existing one
- slot_date is Postgres DATE column (returns 'YYYY-MM-DD' string from Drizzle)

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
- Grocery header: one row — list name h1 on left (single list free), or list pills + "+ Shopping List"
  pill for premium/multi-list. Right side always has + add item and ... more menu.

## Receipt Scanning Rules
- Uses Google Vision TEXT_DETECTION feature via /api/expenses/scan (premium + non-child only)
- Images converted to base64 client-side before POST (fileToBase64 in src/lib/utils/imageUpload.ts)
- Max image size: 10MB. Accepted types: jpg, png, webp, heic
- Mobile: camera input uses capture="environment". Desktop: file picker, no capture attribute
- Both paths send JSON { imageBase64 } to the same /api/expenses/scan endpoint
- Line items are editable (description + amount) in LineItemEditor before confirming
- Per-item assignment: assignedTo[] empty = split equally, non-empty = split among those members
- "Or enter items manually" skips scanning and goes straight to LineItemEditor with empty lineItems
- After LineItemEditor confirm: title, amount, and customSplits auto-filled in ExpenseSheet form
- receipt_data stored as JSON string in expenses.receipt_data column (schema already had this column)
- Expense list rows with receipt_data show a small green Receipt icon badge next to the title
- View mode shows collapsible "Receipt items" section when receipt_data has lineItems
- Parser handles two patterns: item+price on same line ("Milk 2.99") and price-only line where
  previous line is the description (common on many POS receipts)
- hardSkip only blocks definitive non-item metadata (payment type, auth codes, cashier lines)
- Empty scan results (Vision worked, 0 items) show 'empty' state (amber) with "Add items manually"
  button, NOT the error state — error state is only for actual API/network failures
- API always returns 200 with the ParsedReceipt even when lineItems is empty; includes
  warning field when empty: { receipt, warning: "No items detected..." }
- Never throw errors for empty line items — empty is valid, user adds manually in LineItemEditor
- Debug: console.log("[Vision] raw text: ...") logs first 500 chars of Vision output to server terminal

## Key Rules
- Toasts: use sonner only. Import { toast } from "sonner" in client components.
  Import Toaster from @/components/ui/sonner in root layout. Never use @/components/ui/toast.
  richColors: false — we control all colors via .roost-toast-* CSS classes in globals.css.
  Toast styles use slab border-bottom matching the toast type (success green, error red, etc.).
  All toast.error() calls must include a description explaining what went wrong, never just a bare "Error" or "Failed".
- Section colors: always import from src/lib/constants/colors.ts, never hardcode hex values
- Theme colors: always use CSS variables (--roost-bg, --roost-surface, etc.), never hardcode
  background or text colors on any component. Use inline style={{ color: 'var(--roost-text-primary)' }}.
- textMuted (--roost-text-muted): ONLY for timestamps, captions, and helper labels.
  Never for body copy or any text the user needs to read.
- Weather: Open-Meteo free API, no key needed. Location-aware via users.latitude/longitude.
  Falls back to Orlando (28.5, -81.4) when no location stored.
  Unit detection: America/ timezone prefix = Fahrenheit, all others = Celsius (auto on first grant).
  Geolocation requires HTTPS in production — Vercel handles this automatically.
  users table: latitude (numeric nullable), longitude (numeric nullable), temperature_unit (text default 'fahrenheit')
- Touch targets: 48px minimum everywhere, 64px for list rows
- No emojis anywhere, Lucide icons only
- No em dashes and no double hyphens in any UI-facing text, placeholders, copy, or JSX string content.
  Use commas, colons, periods, or reword instead. This applies to ALL files forever.
- Text opacity: never use opacity below /70 for text. Use --roost-text-muted instead of text-primary/50.
## Routing Rules (src/proxy.ts)
- / is always public, never redirected, no auth check
- /login, /signup, /child-login are public; if already signed in, redirect to /dashboard
- All /(app)/* routes require auth; if not signed in, redirect to /login with callbackUrl
- /onboarding requires auth, no household check
- API routes (/api/*) bypass middleware entirely and handle their own auth (return 401/403, not redirect)
- Public assets (/brand/*, /images/*, static files) bypass middleware via matcher config

## Auth Page Layout
- Login and Signup: desktop = flex row split layout (40% red left panel, 60% form right panel)
- Left panel: red background #EF4444, centered logo + wordmark + tagline + 3 feature highlights
- Right panel: background #FFF5F5, centered form, max-width 400px
- Mobile: left panel hidden (hidden sm:flex), right panel full width on #FFF5F5
- Mobile-only logo block: flex sm:hidden at top of form
- Inputs use border: 1.5px solid #F5C5C5, borderBottom: 3px solid #D4CFC9, borderRadius 14px
- Submit button: background #EF4444, borderBottom: 3px solid #C93B3B, borderRadius 14px
- Child login: no split layout, single centered column, max-width 360px, background #FFF5F5
- Child login PIN dots: filled = #EF4444, empty = #F5C5C5
- Child login PIN pad buttons: white bg, border 1.5px solid #F5C5C5, borderBottom 3px solid #D4CFC9

- HIDE_NAV_ROUTES = ['/onboarding']: AppShell hides Sidebar, TopBar, and BottomNav on these routes.
  Add routes here when a page has its own full-screen layout. AppShell also removes the main padding
  offsets (pt-14, pb-16, md:pl-55) on hidden-nav routes.
- Dashboard household guard: always check membersData?.household before rendering dashboard content.
  If household is undefined after data loads, render NoHouseholdState (EmptyState with Home icon,
  redirect to /onboarding). User may land on dashboard without a household during early onboarding.
- DevTools component only renders in development (process.env.NODE_ENV === 'development').
  Never ship DevTools or /api/dev/* routes to production. The route self-guards with a 403.
- Use useHousehold() hook for all client-side premium checks. Never derive isPremium from
  individual feature API responses. Import from src/lib/hooks/useHousehold.ts.
- PremiumGate component handles all premium feature gates. Props: feature (string union).
  Each variant has its own copy, icon, and optional blurred preview component.
  Link upgrade button to /settings/billing.
- Danger zone actions require the user to type "DELETE" into a confirmation input before the destructive button enables. Never allow destructive household actions (delete all data, delete household) with a single click or simple OK dialog.
- Child financial permissions (expenses.view, expenses.add) are always locked off regardless of admin checklist. The API enforces this: enabling child-locked permissions for a child role returns 400.
- PIN is always hashed before storage (hashPassword from better-auth/crypto). Never store child PINs in plain text.
- Settings page sections: Profile (avatar color, name, email, timezone, password change), Appearance (theme grid), Preferences (temperature unit, location, language), Household (rename, invite code, transfer admin), Members (admin only, opens MemberSheet), Notifications (chore reminders toggle), Billing (plan status, upgrade), Danger Zone (admin only, delete data, delete household).
- MemberSheet (admin only): role changes, 12 permission toggles, child PIN change (nested sheet), allowance config (child only), remove member. Child-locked permissions rendered as disabled switches.
- The 12 member permissions: expenses.view, expenses.add, chores.add, chores.edit, grocery.add, grocery.create_list, calendar.add, calendar.edit, tasks.add, notes.add, meals.plan, meals.suggest
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
  Settings page: DONE, 8 sections (Profile, Appearance, Preferences, Household, Members, Notifications, Billing, Danger Zone), MemberSheet, allowance config
  Chores: DONE, list, create, edit, complete, uncheck, streaks, leaderboard, optimistic UI
  Grocery: DONE, lists (free: 1, premium: multiple), items, check/uncheck optimistic, clear checked, activity logging
  Activity feed: DONE, household_activity table, logged for chores + grocery, dashboard reads real data
  Calendar: DONE, month grid + agenda view, DaySheet, EventSheet, attendees, permissions
  Tasks: DONE, create, assign, due date, priority, complete, grouped sections, filter row
  Notes: DONE, quick add bar, masonry grid, view/edit/delete sheet, 1000 char limit
  Reminders: DONE, create/edit/complete, recurring, notify types, banner, cron job
  Push notification setup (Expo)

Phase 3: Money (premium)
  Expenses: DONE, manual entry, split 3 ways, settle up, debt simplification, premium gate
  Bill splitting: DONE (part of expenses module)
  Receipt scanning: DONE, Google Vision TEXT_DETECTION, editable line items, per-member assignment
  Stripe billing: DONE, Checkout, webhooks, cancel/reactivate, Customer Portal, /settings/billing

Phase 4: Polish
  Ambient tablet mode + widget customization
  Meal planning: DONE, weekly planner, meal bank, suggestions + voting, grocery integration
  Expo iOS app
  Android submission
  i18n Spanish pass
  Weather Temperature Units: DONE
    Location-aware weather with user-controlled temperature unit.
    Unit auto-detected from browser timezone on first location grant (America/ = Fahrenheit).
    Falls back to Orlando (28.5, -81.4) when no location stored.
    Settings > Preferences: °F/°C toggle, location status + Update button, language placeholder.

Phase 5: Allowance System (COMPLETE)
  Parent-controlled allowance tied to chore completion.
  Unique to Roost, no competitor has this feature.
  Requires: chores module + expenses module.

  How it works:
    Parent sets weekly allowance amount per child
    Parent sets chore completion threshold (e.g. 80% of assigned chores that week)
    Vercel cron runs every Sunday night, evaluates each child's weekly completion rate
    If child hits threshold:
      Allowance logged as an expense entry (parent "owes" child)
      Child gets push notification: "You earned your $5 allowance this week!"
    If child misses threshold:
      No allowance logged
      Child gets push notification: "You missed your allowance this week. You completed X of Y chores."
      Parent gets a summary notification

  Child view:
    Earned weeks in green, missed weeks in red
    Running total of what parent owes them

  Parent view:
    Each child's weekly completion rate
    Amount earned vs missed, total owed across all children

  Schema additions (build later):
    allowance_settings: id, household_id, user_id (child), weekly_amount (numeric),
      threshold_percent (integer, e.g. 80), enabled (boolean), created_by, created_at
    allowance_payouts: id, household_id, user_id (child), week_start (date),
      amount (numeric), earned (boolean), completion_rate (integer),
      expense_id (references expenses, nullable), created_at

  UI additions (build later):
    Settings page: Allowance section
      Per-child amount input, threshold slider (0-100%), enable/disable toggle per child
      "Preview this week" button showing current completion rates
    Child dashboard: Allowance widget
      This week's progress bar toward threshold
      Projected allowance if they finish, past earnings history
    Expenses page: Allowance section
      Separate from regular expenses, shows pending payouts
      Parent can mark as paid (cash/Venmo)

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
CRON_SECRET

## OG Image (needs manual creation)
- Path: public/og-image.png
- Size: 1200x630px
- Design: red background #EF4444, Roost logo centered (~200px tall), "Home, sorted." tagline below in white Nunito 900
- Used by: OpenGraph (social shares) and Twitter card meta tags in root layout
- No image generation pipeline exists — create manually in Figma or similar and drop into public/

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

## Premium Enforcement UX Patterns
- Free tier limits live in src/lib/constants/freeTierLimits.ts (FREE_TIER_LIMITS)
- Server-side limit checks live in src/lib/utils/premiumGating.ts
- API routes return 403 with { error, code, limit, current } shape when limit hit
- Error codes: CHORES_LIMIT, RECURRING_CHORES_PREMIUM, TASKS_LIMIT, NOTES_LIMIT,
  CALENDAR_LIMIT, RECURRING_EVENTS_PREMIUM, REMINDERS_LIMIT, RECURRING_REMINDERS_PREMIUM,
  REMINDER_NOTIFY_PREMIUM, MEAL_BANK_LIMIT, MEAL_SUGGESTIONS_PREMIUM,
  MEAL_GROCERY_INTEGRATION_PREMIUM, LEADERBOARD_PREMIUM, MEMBERS_LIMIT,
  THEMES_PREMIUM, MULTIPLE_LISTS_PREMIUM
- Mutation error propagation: `const err = new Error(msg) as Error & { code?: string }; err.code = data.code; throw err;`
- Sheet onError: if (err.code && onUpgradeRequired) { onUpgradeRequired(err.code); return; }
- Page pattern: upgradeCode state + <Sheet open={!!upgradeCode}> wrapping <UpgradePrompt code={...} onDismiss={...}>
- All 7 sheet components (ChoreSheet, TaskSheet, ReminderSheet, MealSheet, SuggestionSheet, EventSheet, NoteSheet) have onUpgradeRequired?: (code: string) => void prop
- UpgradePrompt is the shared component for in-sheet upgrade display; maps codes to icon/title/body
- Chores: daily = free, weekly/monthly/custom = premium (Lock icon shown on premium freq buttons)
- Leaderboard button: Lock icon shown + clicking shows UpgradePrompt when not premium
- Grocery: pill row shows for (isPremium || lists.length > 1); + button shows Lock icon for free users
- Settings theme picker: non-default themes show Lock icon overlay for free users, click shows UpgradePrompt
- Expenses: free users see inline upgrade pitch card (no blurred preview), premium users see full module
- Sign out: AlertDialog confirmation in both Sidebar (desktop) and BottomNav More sheet (mobile)
  Calls applyTheme(DEFAULT_THEME) BEFORE signOut() to immediately reset CSS vars, then router.push('/login'), no toast on success
  This prevents midnight theme bleeding into the login page or a new user's session
- Theme on signout: always reset to DEFAULT_THEME immediately in handleSignOut (both Sidebar and BottomNav)
  Do NOT wait for page reload — call applyTheme(DEFAULT_THEME) synchronously before signOut()
- ThemeProvider does NOT read from localStorage. Theme comes exclusively from the server-side initialTheme prop
  (read from users.theme in DB in RootLayout). New users without a users row get DEFAULT_THEME.
- users.theme DB default is 'default' (not 'warm' or any removed theme). Unknown theme keys resolve to DEFAULT_THEME.
- Onboarding CTA buttons always use #EF4444 brand red (never var(--roost-text-primary) which breaks on midnight)

## Session Handoff
At the start of each new session fetch this file to restore context.
Share GitHub file URLs, paste code, or describe what was built.
Update this file after every major decision or completed phase.
## Allowance System Rules
- Allowance is premium only (enforced via household subscription_status)
- allowance_settings: one row per child per household, admin configures via MemberSheet
- allowance_payouts: one row per child per week, unique (household_id, user_id, week_start)
- Cron runs Sunday 11pm UTC via /api/cron/allowances, secured with CRON_SECRET
- Earned allowances create a real expense entry (paid_by = admin, split = child owes admin)
  This means earned allowances appear in the settle-up flow automatically
- Completion rate = (completions this week) / (total assigned chores) * 100
  If no chores assigned, completion rate = 100 (full allowance always paid)
- Children see AllowanceWidget on dashboard (only when allowance is enabled for them)
- Allowance history is visible in the expenses page allowance section (admins/members only)
- Activity types: allowance_earned (green dot, maps to expenses), allowance_missed (amber dot)
- vercel.json cron: /api/cron/allowances runs "0 23 * * 0" (Sunday 11pm UTC)

## Playwright E2E Testing Notes
- Use `**/path` glob patterns for `waitForURL`, not bare `/path` strings, to handle baseURL prefixes
- Add `waitForLoadState("networkidle")` after submit clicks before `waitForURL` (catch silently)
- Onboarding creates a 3-step flow: step 1 picks create/join, step 2 fills name, step 3 is confirmation
  - After "Create household" submit: lands on step 3, NOT /dashboard
  - Must click "Go to dashboard" button on step 3 to navigate to /dashboard
- Household name input placeholder: "e.g. The Johnson House" (CSS `placeholder*="house"` fails — case-sensitive; use `placeholder*="Johnson" i` or `input[type="text"]`)
- Signup submit button uses `data-testid="signup-submit"`, text "Create account"
- Onboarding step 1 "Join" card title is "Join a household" — use full text to avoid strict mode violations
- `signUp` helper: after clicking submit, `waitForURL` accepts both /onboarding and /dashboard via function predicate
- `createHousehold` helper: guards against being called when already on /dashboard
- playwright.config.ts: `timeout: 60000`, `actionTimeout: 15000`, `screenshot: "only-on-failure"`
- `toHaveURL` assertions should use regex (`/\/dashboard/`) not exact strings for robustness
- Mobile project (`iPhone 14`) only runs auth/onboarding/premium specs; navigation/chores/grocery run desktop only
- data-testid attributes added for test targeting:
  - `grocery-quick-add` on grocery quick-add input (src/app/(app)/grocery/page.tsx)
  - `chore-save-btn` on ChoreSheet save/add button (src/components/chores/ChoreSheet.tsx)
  - `dashboard-tiles` on dashboard tiles grid container (src/app/(app)/dashboard/page.tsx)
  - `premium-toggle` on DevTools Switch (src/components/dev/DevTools.tsx) — was already present
- ChoreSheet save button text: "Add chore" (create) or "Save changes" (edit) — not "Save"
- Grocery quick-add placeholder rotates: "Add milk...", "Add eggs...", "Add anything..." — never "Add an item"
- Expenses free-tier shows "Upgrade to Premium for $3/month" and "Upgrade for $3/month" link
- Use `.or()` chaining for multi-text locators; comma-separated `text=` is not valid Playwright CSS
- Playwright runs serially (`fullyParallel: false`, `workers: 1`) to prevent context-crash cascades
- Desktop (chromium) project timeout: 60s; mobile project timeout: 90s
- Grocery check button: `aria-label="Check item"` (unchecked) / `aria-label="Uncheck item"` (checked)
- Checked items section header text: "In the cart (N)" — not "Checked"
- signUp helper networkidle timeout: 30s; waitForURL timeout: 45s
- signUp helper uses `pressSequentially` (not `fill`) for the name field — mobile WebKit's `insertText` protocol command does not fire React `onChange`; per-character key events do
- Premium toggle lives inside collapsed DevTools panel — must click "DEV" pill first to open it before interacting
- DEV button locator must use `.first()` — `text=DEV` matches button + inner text nodes and throws strict-mode error on `.isVisible()`
- Dashboard tile selector: use `.locator('button, a').filter({ hasText: 'Chores' }).first()` to avoid strict mode (both button and inner `<p>` match plain `text=Chores`)
- `uniqueUser` in test files must be a factory function `() => ({...})`, not a plain object — reusing the same email across tests causes "email already exists" failures when tests run serially

Last updated: 2026-04-07 (Homepage redesigned: 9 sections with 6 alternating feature rows, comparison table, personas. Theme system redesign: 2 themes only. Feature card border sweep. Theme signout reset + onboarding button contrast fixes.)

## Stripe Billing Rules
- Stripe Checkout used for payment (redirect to Stripe, return to /settings/billing?success=true)
- Webhook (POST /api/stripe/webhook, raw body) confirms and updates subscription_status in DB
- households.subscription_status is the single source of truth for premium: 'free' | 'premium'
- households.premium_expires_at: set when cancel_at_period_end=true; null when active or expired
- households.stripe_customer_id: created on first checkout, saved immediately before Checkout session
- isCancelled: subscription_status='premium' AND premium_expires_at IS NOT NULL AND expiry > now()
  This means: premium but will expire at period end (cancel_at_period_end=true in Stripe)
- isPremium in useHousehold: status='premium' AND (premium_expires_at is null OR expiry > now())
- Cancel flow: sets cancel_at_period_end=true via Stripe, webhook fires customer.subscription.updated
  which sets premium_expires_at. Household stays premium until that date.
- Reactivate: removes cancel_at_period_end=false, webhook clears premium_expires_at
- Daily cron /api/cron/subscription: expires households where premium_expires_at < now()
  (safety net in case webhook fires late; runs at midnight UTC via vercel.json)
- Webhook events handled: checkout.session.completed, customer.subscription.updated,
  customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed
- payment_failed does NOT revoke premium immediately; Stripe retries, subscription.deleted fires last
- Stripe API version: 2024-12-18.acacia. current_period_end is on subscription item (items.data[0])
- Customer Portal route: /api/stripe/portal, POST, admin only, returns { url } to redirect to
- Admin-only gate on all Stripe routes: role must be 'admin', returns 403 otherwise
- /api/stripe/webhook has NO session auth — verified via Stripe signature only
- Retention screen shown before cancel: lists what the household will lose, "Keep Premium" vs "Cancel"
- /settings/billing: free users see upgrade card; premium users see features + manage/cancel; 
  cancelling users see amber warning + reactivate; success/cancelled URL params show dismissing banners
- STRIPE_PRICE_ID env var: the monthly $3 price ID (price_...) from Stripe dashboard

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
