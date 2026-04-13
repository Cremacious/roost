@AGENTS.md
# Roost — Project Intelligence

## Feature Registry
See FEATURES.md in the root of the repo for the complete list of built and planned
features, paywall copy, and App Store description. Update it whenever a new feature ships.

## Product Roadmap

### Web Features (build before iOS launch)
Priority order:

1. Premium themes
   - Forest, Slate, Sand, Ocean, Rose, Carbon
   - Already defined in FREE_TIER_LIMITS constants
   - CSS variables only, zero operating cost
   - Status: PLANNED

2. Recurring calendar events
   - Daily, weekly, biweekly, monthly, yearly
   - End conditions: never, on date, after N occurrences
   - Expand-on-fetch (no cron, no child rows)
   - Status: DONE

3. Household stats page (/stats or /insights)
   - Uses existing data, no new APIs needed
   - Chore completion rates, expense totals,
     most active member, streak leaders,
     household activity over time
   - Premium feature
   - Status: DONE

4. Rich text notes (premium)
   - Replace plain textarea with Tiptap editor
   - Headings, bold, italic, checklists, links
   - Tiptap is open source, zero cost
   - Status: DONE

5. Guest/temporary member
   - Invite someone temporarily via link or code
   - Auto-expires after a set date
   - Good for Airbnb splitting, visiting family,
     roommate turnover
   - Premium feature
   - Status: DONE

6. Grocery smart sort
   - Auto-sort list by store section
   - Produce, dairy, frozen, bakery, meat, etc.
   - Pure client-side logic, zero API cost
   - Free feature
   - Status: DONE

7. Custom chore categories and icons
   - Admins create custom categories
   - Members can suggest categories
   - Premium feature
   - Status: DONE

8. Superadmin panel (/admin — separate from app)
   - Internal tool, not user-facing
   - Protected by separate admin credentials
   - Features:
     - User list with search and filters
     - Household list with subscription status
     - Charts: signups over time, premium
       conversion rate, active households,
       chore/expense/meal activity metrics
     - Manually set any household to
       premium or free (override Stripe)
     - View any user's household, role,
       join date, last active
     - Impersonate user (view-only mode)
     - Export user data as CSV
   - Status: DONE (overview + users + households pages built; impersonate/CSV export deferred)

### Platform (after web is launched)
9. iOS app via Expo
10. Android app via Expo
11. Ambient tablet mode
12. Spanish localization (i18n pass)

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
- Azure Document Intelligence (receipt OCR, prebuilt-receipt model)
- Expo Push Notifications (free, iOS + Android)
- Vercel hosting + Vercel Cron (scheduled jobs)
- Resend (transactional email, invites only)
- Open-Meteo (weather, free, no key needed)
- Nunito font (via next/font/google, variable --font-nunito)

## Pricing Model
- Free tier: 1 household, up to 5 members, core features
- Premium: $4/month per household (not per user)
- Admin pays, all household members benefit
- Stripe for web, RevenueCat for iOS/Android in-app purchase

## Operating Costs (at launch = ~$0/month)
- Vercel: free hobby tier
- Neon: free tier (0.5GB)
- Azure Document Intelligence: 500 scans/month free on F0 tier
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
- Receipt scanning (Azure Document Intelligence)
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
- Receipt scanning: photo in-app, Azure Document Intelligence OCR,
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
  auth page left panel, upgrade/billing CTAs, homepage hero, sidebar background. Nowhere else.
- Sidebar background: hardcoded #DC2626 (brand red). Does NOT use --roost-sidebar-bg CSS variable.
  Sidebar active state: rgba(255,255,255,0.22) white fill on red background.
  All sidebar text, icons, and dividers use white/rgba-white values — no CSS variables inside the sidebar.
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
  upgrade/billing CTAs, homepage hero, sidebar background (#DC2626). NOT used for shadcn --primary.
- Sidebar uses #DC2626 (slightly darker red) as its background. Active nav state inside the sidebar
  is rgba(255,255,255,0.22) — a white frost overlay, not a separate red accent.
- Section colors unchanged (chores, grocery, calendar, expenses, meals, notes, reminders, tasks)
- Date subheading on dashboard always uses #9B9590 hardcoded — never tinted by theme
- TopBar: household name + weather chip + time only. No user avatars.
  Mobile (<md): background #C0160C (red), RoostLogo variant="white", weather chip rgba(255,255,255,0.18) bg + white text, time white.
  Desktop (md+): background var(--roost-topbar-bg), household name, weather chip and time use CSS variable colors.
  Weather chip and time are split into mobile/desktop JSX variants (md:hidden / hidden md:block) because inline styles cannot be overridden by Tailwind responsive classes.
  Header bg uses Tailwind responsive classes: bg-[#C0160C] md:bg-(--roost-topbar-bg) (Tailwind v4 CSS variable syntax).
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
    Neutral card border-bottom (var(--roost-border-bottom)) -- for non-feature cards (NOT dashboard tiles)
    Text colors (var(--roost-text-*))
    Sidebar, topbar, dividers
  NEVER use var(--roost-border-bottom) on feature-specific interactive elements.
  NEVER let brand red (#EF4444) appear on non-chores/non-settings pages except sidebar active nav.
  Dashboard tiles use section-colored slab borders (border-bottom: 3px solid SECTION_DARK_COLOR).
  Each tile has a 44x44 rounded-square icon badge with tinted section bg, a 1px divider,
  and feature name + subtext below. TILE_STYLES config in dashboard/page.tsx maps each section
  to badgeBg, slabBorder, and iconStroke colors. Expenses "Premium feature" subtext renders
  in green (#15803D) at fontWeight 500 instead of default muted gray.
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
  Dashboard: tiles grid (grid-cols-2 mobile, md:grid-cols-4 desktop, gap-3) + activity feed stacked vertically.
  Activity feed on dashboard: max 5 items, "See all" links to /activity.
  Activity page (/activity): full feed with "Load more" pagination, 20 items per page.
  Notes: masonry grid columns-1 sm:columns-2 lg:columns-3 inside PageContainer.
- CarPlay-inspired large tile grid on tablet + desktop
- Bottom tab bar on mobile (Home, Chores, Grocery, Calendar, More)
  More opens a sheet with Profile and Settings links
- Sheet Rules (ALL sheets in the app):
  ALL content bottom sheets use DraggableSheet (src/components/shared/DraggableSheet.tsx).
  This wraps shadcn Sheet (side="bottom") with a colored drag handle pill and centered desktop layout.
  DraggableSheet wraps shadcn Sheet (Radix Dialog) internally so height sizes to content correctly.
  Drag-to-dismiss is implemented via native touch events on SheetContent — fires only when touch starts on the handle area (data-drag-handle). Dragging 120px+ down dismisses; less snaps back. No third-party gesture library.
  shadcn Sheet (side="bottom") is ONLY used for: BottomNav "More" menu, PremiumGate (sheet trigger).
  DraggableSheet props: open, onOpenChange, children, featureColor? (handle color), desktopMaxWidth? (default 680)
  Desktop centering: inline style left: "50%", right: "auto", transform: "translateX(-50%)", maxWidth: desktopMaxWidth on SheetContent.
  EventSheet uses desktopMaxWidth={860} for two-column desktop layout.
  Correct usage pattern:
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Sheet Title
        </p>
        {/* all form content */}
      </div>
    </DraggableSheet>
  Rules: The drag handle is rendered automatically by DraggableSheet — never add a manual handle div.
  Inner content divs use px-4 pb-8 only. No overflow-y-auto or maxHeight on inner divs — the sheet itself handles scroll via overflowY: auto and maxHeight: 96dvh on SheetContent.
  onOpenAutoFocus={(e) => e.preventDefault()} on SheetContent prevents iOS Safari from
  auto-focusing the first input and raising the keyboard before the user sees the form.
- Mobile Safari UX rules:
  All inputs/textareas/selects/[contenteditable] have font-size: 16px !important on mobile
  (globals.css @media max-width 768px). iOS Safari auto-zooms on focus when font-size < 16px.
  viewport export in layout.tsx sets maximumScale: 1 as a secondary guard against auto-zoom.
  Tiptap RichTextEditor has autofocus: false hardcoded in useEditor — Tiptap calls .focus()
  programmatically and bypasses Radix onOpenAutoFocus. Never pass autofocus prop to RichTextEditor.
  Never use autoFocus on any input or textarea inside a sheet. On real iOS Safari, native autoFocus
  fires before Radix onOpenAutoFocus can intercept it, raising the keyboard before the sheet animation
  completes. Users tap to focus. This rule applies to every sheet component in the app.
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
src/proxy.ts                                   Route protection (Next.js 16 middleware); includes onboarding guard (redirects un-onboarded users to /onboarding)
src/lib/auth/index.ts                          better-auth server config
src/lib/auth/client.ts                         better-auth client (signIn, signUp, signOut, useSession)
src/lib/auth/helpers.ts                        requireSession, requireHouseholdMember, requireHouseholdAdmin, requirePremium, blockChild
src/lib/constants/colors.ts                    All 8 section colors, always import from here
src/lib/constants/themes.ts                    2 themes: default (neutral light), midnight (dark). Both free.
src/lib/store/themeStore.ts                    Zustand store: { theme, setTheme }
src/lib/db/index.ts                            Neon + Drizzle instance
src/db/schema/auth.ts                          better-auth tables (user, session, account, verification)
src/db/schema/households.ts
src/db/schema/users.ts                         App user table; includes theme, latitude, longitude, temperature_unit, chore_reminders_enabled columns (chore_reminders_enabled unused in UI — column kept in schema); also onboarding_completed (bool), has_seen_welcome (bool), is_child_account (bool), child_of_household_id (text)
src/db/schema/members.ts                       household_members, member_permissions
src/db/schema/chores.ts                        chores, chore_completions, chore_streaks
src/db/schema/grocery.ts                       grocery_lists, grocery_items
src/db/schema/tasks.ts
src/db/schema/calendar.ts                      calendar_events, event_attendees
src/db/schema/notes.ts
src/db/schema/expenses.ts                      expenses, expense_splits
src/db/schema/notifications.ts                 notification_queue
src/db/schema/activity.ts                      household_activity table (id, household_id, user_id, type, entity_id, entity_type, description, created_at)
src/db/schema/allowances.ts                    reward_rules + reward_payouts tables (new system). Old allowance_settings + allowance_payouts kept for migration safety, not used.
src/db/schema/index.ts                         Re-exports all tables
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx                 Email/password + strength meter + confirm field
src/app/(auth)/child-login/page.tsx            Household code + PIN, 64px inputs
src/app/(app)/layout.tsx                       App shell: TopBar + Sidebar + BottomNav + QueryProvider
src/app/(app)/onboarding/page.tsx              3-step create/join household flow
src/app/(app)/dashboard/page.tsx               Tile grid + activity feed, all CSS variable colors
src/app/(app)/settings/page.tsx                Full settings page: Profile, Appearance, Preferences, Household, Members (all roles), Notifications, Billing, Danger Zone (admin)
src/app/(app)/chores/page.tsx                  Chores list, summary bar, view toggle, optimistic completion + uncheck
src/app/layout.tsx                             Root layout: Nunito font, ThemeProvider with server-side theme
src/app/globals.css                            Tailwind + shadcn vars + --roost-* CSS variable defaults
src/app/api/auth/[...all]/route.ts             better-auth catch-all handler
src/app/api/auth/child-login/route.ts          GET: list child accounts for a household (public, by householdCode); POST: verify PIN + create session via internalAdapter
src/app/api/household/create/route.ts          POST: create household, generate unique code
src/app/api/household/join/route.ts            POST: join by code, premium multi-household check
src/app/api/household/members/route.ts         GET: household info + member list with user data (includes email)
src/app/api/household/members/[id]/route.ts    DELETE: remove member (admin only, cannot remove admin or self)
src/app/api/household/members/[id]/role/route.ts  PATCH: change member role; child role locks all child-locked permissions
src/app/api/household/members/[id]/permissions/route.ts  GET + PATCH: 12 permission toggles; child-locked perms cannot be enabled for child role
src/app/api/household/members/[id]/pin/route.ts  PATCH (admin only): set/change child PIN, hashed before storage
src/app/api/household/members/[id]/allowance/route.ts  GET + PATCH (admin only): allowance settings per child member
src/app/api/household/members/add-child/route.ts  POST (admin only): accepts { name, pin }, validates pin is exactly 4 digits, create child user (no email, is_child_account=true), hash provided PIN, return child + pin
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
src/lib/utils/grocerySort.ts                   STORE_SECTIONS, StoreSection, classifyItem(name), groupItemsBySection(items) -- pure client-side keyword classifier for grocery smart sort
src/lib/utils/seedChoreCategories.ts           seedChoreCategories(householdId): idempotent, inserts 8 defaults if none exist
src/db/schema/choreCategories.ts               chore_categories table: id, household_id, name, icon, color, is_default, is_custom, suggested_by, status
src/app/api/chore-categories/route.ts          GET (free, auto-seed, active+pending for admin) + POST (admin+premium, create)
src/app/api/chore-categories/suggest/route.ts  POST (member+premium): suggest category with status=pending
src/app/api/chore-categories/[id]/route.ts     PATCH (admin: approve/reject/edit) + DELETE (unassign chores, then delete)
src/components/chores/choreIconMap.ts          CHORE_ICON_MAP (29 Lucide icons) + CHORE_ICON_OPTIONS
src/components/chores/ChoreCategoryPicker.tsx  Category picker: None tile, defaults grid, custom grid, inline create/suggest form (premium-gated); exports ChoreIcon + ChoreCategory type
src/lib/admin/auth.ts                          createAdminSession (jose SignJWT HS256 8h), verifyAdminSession, checkAdminCredentials (env vars)
src/lib/admin/testFilters.ts                   TEST_USER_CONDITIONS, TEST_HOUSEHOLD_CONDITIONS, EXCLUDE_TEST_USERS_SQL, EXCLUDE_TEST_HOUSEHOLDS_SQL — single source of truth for test account patterns. Email patterns: %@example.com, %@roost.test, %test%. Name patterns include all seeded E2E accounts (Free Admin, Premium Admin, Test Member, Test Child) and legacy Playwright names.
src/lib/admin/requireAdmin.ts                  requireAdminSession(request) — returns Response|null; parses cookie header manually
src/app/api/admin/login/route.ts               POST (no auth): verify credentials, create JWT, set HttpOnly cookie
src/app/api/admin/logout/route.ts              POST: clear admin cookie, redirect to /admin/login
src/app/api/admin/stats/route.ts               GET: 5 parallel sql queries — totalUsers, totalHouseholds, premium/free counts, signupsOverTime, conversionsOverTime (90 days)
src/app/api/admin/users/route.ts               GET: paginated user list with search + filter, camelCase response
src/app/api/admin/households/route.ts          GET: paginated household list with ARRAY_AGG member emails, search by name OR invite code, filter, camelCase response
src/app/api/admin/households/[id]/route.ts     PATCH: set subscription_status premium/free, COALESCE subscription_upgraded_at, logActivity
src/app/(admin)/layout.tsx                     Admin shell: reads x-pathname header, skips auth for /admin/login, dark nav
src/app/(admin)/admin/login/page.tsx           Admin login: dark card, indigo (#6366F1) branding, POST to /api/admin/login
src/app/(admin)/admin/page.tsx                 Admin overview: 6 StatCards + 2 Recharts AreaCharts (signups + conversions)
src/app/(admin)/admin/users/page.tsx           Users table: search, filter pills, paginated, expandable rows with copyable IDs
src/app/(admin)/admin/households/page.tsx      Households table: search by name or invite code, filter, Set Premium/Free button, ConfirmDialog, optimistic update, expandable rows
src/app/(admin)/admin/promo-codes/page.tsx    Promo codes admin: create form (code/duration/max/expiry), filter tabs, table with status badges, copy code, pause/activate/deactivate actions
src/db/schema/promoCodes.ts                   promo_codes + promo_redemptions tables
src/app/api/admin/promo-codes/route.ts        GET (list all) + POST (create with auto-gen or custom code)
src/app/api/admin/promo-codes/[id]/route.ts   PATCH: update status (active/paused/deactivated)
src/app/api/promo-codes/redeem/route.ts       POST: validate + redeem code, set household premium, log activity
src/app/api/promo-codes/status/route.ts       GET: active promo redemptions for current household
src/lib/utils/time.ts                          relativeTime(date) -- returns "Just now", "Xm ago", "Xh ago", "Yesterday", "Xd ago"
src/lib/hooks/useHousehold.ts                  Client hook: returns { household, role, permissions, isPremium, isLoading, error } via /api/household/me
src/lib/hooks/useUserPreferences.ts            Client hook: returns { temperatureUnit, latitude, longitude, updatePreferences } via /api/user/preferences
src/app/api/user/preferences/route.ts          GET + PATCH: temperature_unit, latitude, longitude, timezone, language
src/app/api/user/profile/route.ts              GET + PATCH: name, email (unique check), avatar_color, timezone, language, push_token; GET includes has_seen_welcome
src/app/api/user/dismiss-welcome/route.ts      POST: sets has_seen_welcome=true for current user (called by WelcomeModal on dismiss)
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
src/components/shared/DraggableSheet.tsx        shadcn Sheet (side="bottom") wrapper with colored handle pill + centered desktop layout; props: open, onOpenChange, children, featureColor?, desktopMaxWidth? (default 680); used for all content bottom sheets
src/components/shared/PremiumGate.tsx          Unified premium gate: 3 trigger variants (sheet/inline/page), driven by PREMIUM_GATE_CONFIG keyed by feature slug
src/lib/constants/premiumGateConfig.ts         PREMIUM_GATE_CONFIG: 13 feature entries (chores/grocery/expenses/calendar/tasks/notes/reminders/meals/allowances/guests/themes/stats/chore-categories), each with featureColor, featureHex, featureDarkHex, icon, title, subtitle, perks[], valueProp. "allowances" key used for the Rewards feature gate (key name kept stable, copy updated to reflect flexible rewards system).
src/components/settings/MemberSheet.tsx        Admin member management: role picker, 12 permission toggles, child PIN change, rewards info callout (pointing to Chores page), remove member
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
src/components/notes/RichTextEditor.tsx        Tiptap rich text editor: toolbar (bold/italic/strike/H1-H3/lists/task list/blockquote/code/link/undo-redo), editable + hideToolbar props, CSS in globals.css
src/components/notes/NoteSheet.tsx            Premium: RichTextEditor with auto-save checkboxes in view mode; Free: plain textarea + upgrade nudge; onUpgradeRequired prop; uses DraggableSheet
src/db/schema/invites.ts                      household_invites table: token (unique 64-char hex), email, is_guest, expires_at (membership), link_expires_at (7 days), accepted_at, accepted_by_user_id, deleted_at
src/lib/utils/inviteToken.ts                  generateInviteToken() (32 bytes hex), getInviteUrl(token) using NEXT_PUBLIC_APP_URL
src/app/api/household/invite/route.ts         POST (admin + premium): create guest invite link; validates expires_in_days (1/3/7/14/30) or expires_at_custom (1-365 days); link_expires_at = 7 days
src/app/api/invite/[token]/route.ts           GET (public): check invite validity, return household_name + expires_at + email (404/410/200); POST (auth): join as guest role + 12 default permissions + mark accepted
src/app/api/cron/guest-expiry/route.ts        Daily 2am UTC: hard-delete expired guest household_members rows + member_permissions; logs guest_expired activity
src/app/invite/[token]/page.tsx               Public invite landing page: loading/valid/not_found/expired/error states; shows household name, amber guest badge, 5 capability bullets; logged-in join button or signup+login links
src/components/settings/InviteGuestSheet.tsx  Admin-only guest invite sheet: optional email, preset pills (1d/3d/1w/2w/30d), custom date, live preview, generate link, copy + share; amber color scheme
src/components/settings/AddChildSheet.tsx     Admin-only sheet: name input + custom 4-digit PIN input with show/hide toggle (step A) + success view with PIN display and copy button (step B); calls POST /api/household/members/add-child with { name, pin }; invalidates ["members"] query
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
src/db/schema/meals.ts                        meals, meal_plan_slots, meal_suggestions, meal_suggestion_votes; meal_suggestions now stores target_slot_date, target_slot_type, status(suggested/in_bank/accepted/rejected), responded_by/at, accepted_meal_id, accepted_slot_id
src/app/api/meals/route.ts                    GET (meal bank list, ordered by name) + POST (create meal, blockChild)
src/app/api/meals/[id]/route.ts               PATCH (edit, creator or admin) + DELETE (soft delete)
src/app/api/meals/[id]/add-to-grocery/route.ts  POST: push meal ingredients to default grocery list + activity log
src/app/api/meals/planner/route.ts            GET (week slots, ?weekStart=YYYY-MM-DD, joins meals+users) + POST (upsert via onConflictDoUpdate)
src/app/api/meals/planner/[id]/route.ts       DELETE: hard delete slot (creator or admin)
src/app/api/meals/suggestions/route.ts        GET (suggested + in_bank, vote counts, userVote, target day/slot, sorted by upvotes) + POST (all roles including children, requires target day + slot)
src/app/api/meals/suggest/route.ts            POST alias for meal suggestions create flow
src/app/api/meals/suggestions/[id]/vote/route.ts  POST: toggle up/down vote (same vote = remove)
src/app/api/meals/suggestions/[id]/approve/route.ts  POST: admin only, creates meal bank entry; destination="bank" sets status=in_bank (card stays visible); destination="planner" upserts slot + sets status=accepted (card removed)
src/app/api/meals/[id]/accept/route.ts        PUT alias for accepting a meal suggestion into the planner
src/app/api/meals/[id]/reject/route.ts        DELETE: admin only, marks a meal suggestion as rejected
src/components/meals/MealSheet.tsx            Create/edit meal: name, category pills, description, prep time, dynamic ingredients list; onUpgradeRequired prop
src/components/meals/MealSlotSheet.tsx        Slot picker: menu mode, bank search, quick add, date-pick mode (preSelectedMeal prop), view/remove existing slot
src/components/meals/SuggestionSheet.tsx      Suggest a meal: name, target day, target slot, ingredients, note, prep time (all roles); posts to /api/meals/suggest
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
src/app/api/rewards/route.ts                  GET (admin: all rules with progress per child; child: own rules) + POST (create rule); exports getPeriodBounds()
src/app/api/rewards/[id]/route.ts             PATCH (update rule fields) + DELETE (hard delete if no payouts, else soft disable)
src/app/api/rewards/child/route.ts            GET: rules with current period progress + last 12 payouts for current user
src/app/api/rewards/payouts/[id]/route.ts     PATCH: acknowledge payout (child sets acknowledged=true, logs activity)
src/app/api/cron/rewards/route.ts             Vercel cron GET (nightly 11pm UTC): evaluate completed periods, create payouts, create expense entries for money rewards
src/components/chores/RewardRuleSheet.tsx     Create/edit reward rule sheet: child selector, name, period, threshold slider, reward type + detail; exports RewardRule + RewardMember types
src/components/shared/RewardsWidget.tsx       Child-only dashboard widget: unacknowledged claim cards, active rule progress bars, payout history; query key ["rewards-child"]
src/app/(app)/chores/allowances/page.tsx      Rewards management page (admin + premium): how-it-works explainer, per-rule cards with period/reward/threshold badges, progress bars, enable/disable toggle, empty states for no-children and no-rules; opens RewardRuleSheet
src/components/shared/WelcomeModal.tsx        First-visit welcome dialog: shadcn Dialog, 3 tip rows (household/child/chores), red CTA dismisses + POSTs /api/user/dismiss-welcome; shown when has_seen_welcome=false
src/lib/hooks/use-paginated-list.ts           usePaginatedList<T>(items, { pageSize }) — client-side slice pagination; auto-resets when items identity changes; returns visibleItems, hasMore, loadMore, reset, visibleCount, totalCount
src/components/ui/show-more-button.tsx        ShowMoreButton — renders "Showing X of Y" + "+ Show N more" slab button; returns null when all items visible; accepts color prop for section tinting
src/lib/utils/azureReceipts.ts              parseReceiptImage(base64) via Azure Document Intelligence prebuilt-receipt, returns ParsedReceipt
src/lib/utils/imageUpload.ts                fileToBase64(File), validateReceiptImage(File) client-side helpers
src/app/api/expenses/scan/route.ts          POST: premium + non-child only, accepts { imageBase64 }, returns { receipt: ParsedReceipt }
src/components/expenses/ReceiptScanner.tsx  Scan flow UI: idle (camera + upload buttons), scanning (animated), error (retry)
src/components/expenses/LineItemEditor.tsx  Edit scanned line items, assign per member or split equally, confirm to pre-fill form
src/app/api/chores/history/route.ts         GET: premium-only, filtered chore_completions with member/date filters, returns completions + stats
src/app/(app)/chores/history/page.tsx       Chore completion history: member pills, date range, stats row, date-grouped list, load more
src/app/(app)/expenses/page.tsx             Expenses: two-col desktop (balance hero + settle + expenses), chip strip mobile, pending confirmations
src/components/expenses/SettleSheet.tsx     Two-sided settle flow: claim / waiting / confirm-or-dispute modes
src/components/expenses/ExportSheet.tsx     Export: date range, quick-range pills, CSV/PDF format, preview, file download
src/app/api/expenses/settle-all/route.ts    POST: initiate claim (settled_by_payer=true), replaced immediate-settle
src/app/api/expenses/settle-all/claim/route.ts    POST: debtor claims they paid creditor
src/app/api/expenses/settle-all/confirm/route.ts  POST: creditor confirms receipt, sets settled=true
src/app/api/expenses/settle-all/dispute/route.ts  POST: creditor disputes claim, resets settled_by_payer
src/app/api/expenses/settle-all/cancel/route.ts   POST: debtor cancels their pending claim
src/app/api/expenses/settle-all/remind/route.ts   POST: send reminder to payee (rate limited 1/24h)
src/app/api/expenses/export/route.ts        GET: export expenses as CSV or PDF (pdfkit, premium only)
src/app/api/expenses/export/preview/route.ts  GET: preview count + total for date range (premium only)
src/app/api/cron/settlement-reminders/route.ts  Daily 10am UTC: notify payees of pending claims >7 days old
src/db/schema/recurring_expenses.ts           recurring_expense_templates table: id, household_id, created_by, title, category, notes, total_amount, frequency, next_due_date, last_posted_at, paused, splits (json), created_at, updated_at, deleted_at
src/app/api/expenses/recurring/route.ts       GET: list all templates (non-deleted, premium-gated); POST: create template (admin + premium); exports advanceRecurringDate(from, frequency) helper
src/app/api/expenses/recurring/[id]/route.ts  PATCH: update template (paused, title, notes, frequency, totalAmount, splits); DELETE: soft-delete + unlink expense history
src/app/api/expenses/recurring/[id]/post/route.ts  POST: admin confirms draft (converts is_recurring_draft=true to false, or creates fresh); advances next_due_date; notifies all members
src/app/api/expenses/recurring/[id]/skip/route.ts  POST: skip cycle without posting; deletes draft; advances next_due_date
src/app/api/cron/recurring-expenses/route.ts  Daily 8am UTC: create draft expenses for due templates; notify admins; remind for >3-day-old unconfirmed drafts
src/components/expenses/RecurringDraftSheet.tsx  Bottom sheet listing pending draft expenses; Post/Skip per card; auto-closes when all handled
src/components/expenses/EditRecurringSheet.tsx   Edit sheet for a recurring template: title, amount, category, frequency, next_due_date, notes, splits editor, pause/resume, delete with AlertDialog
src/app/page.tsx                              Public marketing homepage (server component, no app shell). Sections: Nav, teaser bar (#DC2626), hero (icon + H1 + 2 buttons + note), problem (eyebrow + result pill), 7 alternating feature rows (Chores/Grocery/Calendar/Expenses/Reminders/Meals/Allowances with mockup), comparison table vs Splitwise/Cozi/OurHome (13 rows, 5 cols), personas (3 cards), bottom CTA, footer. No pricing section. No em dashes, no bullet lists. Red nav and footer, warm-tinted feature sections. Allowances section bg #F5F3FF, eyebrow color #7C3AED. Feature layout: CSS order property -- odd rows (Chores/Cal/Rem/Allow): copy left (order:1), UI right (order:2); even rows (Grocery/Exp/Meals): feat-ui-left class swaps to UI left (order:1), copy right (order:2). Mobile: feat-inner flex-direction:column, feat-copy order:1 !important (always top), feat-ui order:2 !important (always bottom). Responsive via .feat-inner/.feat-copy/.feat-ui CSS classes + <style> block at 640px breakpoint.
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
src/app/api/stats/route.ts                    GET: premium-only stats; 22 parallel SQL aggregation queries (Promise.all); accepts start/end ISO date params; returns chores/expenses/tasks/meals/grocery/activity/household breakdown
src/app/(app)/stats/page.tsx                  Household stats page: date range presets (7/30/90/year/custom), 6 stat cards, 6 Recharts charts (AreaChart x2, DonutChart x2, HorizontalBarChart x2), member overview table, household footer
src/lib/constants/colors.ts                   Added "stats": "#6366F1" (indigo) to SECTION_COLORS

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
- Free tier: expenses page is fully accessible (view list, add expense, split bill)
- Premium inline gates (click-time check, opens PremiumGate sheet trigger="sheet" feature="expenses"):
  - Receipt scanning (scan button in ExpenseSheet, gated via isPremium check before setScanView)
  - Expense categories (CategoryPicker replaced by locked button for free users, calls onUpgradeRequired)
  - Recurring/repeat toggle in ExpenseSheet (Lock icon shown, tapping calls onUpgradeRequired)
  - Budget tab/button (Budget page has its own page-level gate too)
  - Insights tab/button (Insights page has its own page-level gate too)
  - Export button, Recurring tab
- Gate pattern: upgradeCode state + setUpgradeCode(code) on click + PremiumGate feature="expenses" trigger="sheet" at bottom of page when upgradeCode is truthy
- Note: API POST /api/expenses still requires premium server-side (free users hit a 403 if they submit)
- Desktop: two-column grid (340px left: balance hero + settle cards; 1fr right: expense list)
- Mobile: scrollable 3-chip strip (You're owed / You owe / Spent this month) with scroll dots + right-fade overlay
- Balance hero (desktop): 3-column stat box inside SlabCard — green border-bottom if owed, red if you owe
- Chip strip dots: active chip = pill (18px wide, section color), inactive = 6px circle (border-bottom color)
- Pending confirmations section: amber SlabCard, shown when current user is payee of a pending claim
- Two-sided settlement flow: debtor claims via /claim, creditor confirms via /confirm or disputes via /dispute
  - Split states: settled_by_payer=true (claimed), settled_by_payee=true (confirmed), settled=true (fully done)
  - settlement_disputed=true: dispute resets payer claim, notifies debtor
  - Payer can cancel pending claim via /cancel; can send reminder via /remind (rate limited: 1/24h via settlement_last_reminded_at)
  - SettleSheet modes: fresh (show "I paid X" button), i_claimed (waiting + cancel + remind), they_claimed (confirm + dispute)
- DebtCard payer-pending state (i_claimed): card opacity 0.65, amber border-bottom, gray amount, amber "Awaiting confirmation" badge (Clock icon), inline "Remind · Cancel" action links (stop propagation). Clicking card opens SettleSheet in pending mode.
- DebtCard payee-pending state (they_claimed): solid green border-bottom, pulsing green dot next to name, "Confirm received" small green slab button.
- DebtCard passes initialState ("pending" | "initial") to openSettle, SettleSheet accepts initialState prop to force the waiting view.
- pendingClaim is embedded directly on each DebtItem from the API (not a separate flat array). API route embeds it via enhancedDebts map.
- Expense row shows "your share" below total: green (you paid, owed back), red (you owe), gray (settled)
- Export: ExportSheet with date range (From/To + quick-range pills), CSV/PDF format toggle, preview count/total
  - GET /api/expenses/export?from=&to=&format=csv|pdf triggers file download
  - GET /api/expenses/export/preview?from=&to= returns {count, total}
  - PDF via pdfkit (built-in fonts only, no filesystem): header, summary box, expense table grouped by month
  - pdfkit Buffer must be wrapped in new Uint8Array() before passing to Response constructor
- API returns pendingClaims[] and totalSpentThisMonth alongside debts/balances/expenses
- Debt simplification algorithm: net balance per person, greedy creditor/debtor matching
- ExpenseSheet: 3 split methods: Equal (auto-divide), Custom (per-member inputs), Just me (payer pays all)
- Amount field is disabled in edit mode (can only edit title and category)
- numeric columns from Drizzle return as strings, always parseFloat() before arithmetic
- paid_by is the creator for permission checks (no separate created_by column on expenses)
- Dashboard expenses tile: statusText is dynamic ("You owe $X" / "Owed $X" / "All settled" / "Premium feature")
- Settlement cron: /api/cron/settlement-reminders runs daily at 10am UTC, notifies payees of claims >7 days old

## Calendar UX Patterns
- Two views: Month grid (default) and Agenda list (next 60 days from today)
- Month view: desktop (md:) = full month grid + DaySheet on tap; mobile = week strip + inline day event list
- Mobile week strip: 7-day horizontal strip in blue-bordered slab card; prev/next arrows + month-year label; single-letter day names via format(day, "EEEEE"); today = filled blue circle; selected = #DBEAFE bg/#1D4ED8 text; 4px event dot below circle
- Mobile week state: mobileWeekStart (startOfWeek weekStartsOn:0) + mobileSelectedDay (today); goMobileWeek(dir) shifts 7 days, syncs currentMonth at month boundaries
- Mobile day event list: EEEE MMM d heading + count badge; event cards with 4px left blue accent bar + title/time/creator; dashed empty state "Nothing scheduled"
- Event pills in day cells: blue bg (#3B82F6 at 15%), blue text, 11px, border-bottom slab (desktop only)
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
- Recurring events: expand-on-fetch architecture. Template row stored once; GET route generates instances dynamically for the queried month range. No child rows, no cron.
- Recurring fields on calendar_events: recurring (bool), frequency (daily/weekly/biweekly/monthly/yearly), repeat_end_type (forever/until_date/after_occurrences), repeat_until (timestamp), repeat_occurrences (integer)
- recurrence.ts utility: expandRecurringEvent() + expandEventsForRange() in src/lib/utils/recurrence.ts
- Recurring instances share their template's ID — editing or deleting any instance always affects the whole series
- isRecurring: true on expanded instances; template_start_time carries the original start so edit mode uses the anchor date
- EventSheet edit mode shows "Editing this event will update all occurrences" notice when isRecurring
- EventSheet delete dialog says "All occurrences will be removed" when isRecurring
- Event key in all renders: id+start_time composite (not just id) to handle multiple instances of the same template in one view
- RecurringFields sub-component in EventSheet: Repeat toggle (Lock icon for free users), 5 frequency pills, 3 end-type pills, until-date input or after-N-occurrences input
- Recurring indicator: small Repeat icon shown next to event title in month grid pills, mobile day list, agenda view, and DaySheet
- Premium gate: toggling Repeat on while free calls onUpgradeRequired("RECURRING_EVENTS_PREMIUM"); Lock icon shows on the toggle row for free users

## Meal UX Patterns
- Three tabs: Planner, Meal Bank, Suggestions
- Meals section color: #F97316 (orange), slab border-bottom: #C4581A
- Weekly planner: Mon-Sun grid, 4 slots per day (breakfast, lunch, dinner, snack)
  Week navigation: prev/next arrows + "This week" jump button
  Empty slot: dashed slab card, tap opens MealSlotSheet
  Filled slot: orange-tinted slab card, tap opens MealSlotSheet (view/remove/change)
  Desktop (sm+): CSS grid repeat(7,1fr), no overflow/scrollbar. className="hidden sm:grid w-full", gridTemplateColumns repeat(7,1fr)
  Mobile (<sm): vertical day list, className="block sm:hidden". Each day is a card with 4 slot rows.
  All slots fixed height 72px on desktop. Mobile slots use flex row (label + meal name or "Tap to plan").
  Day headers fixed height 56px on desktop for column alignment.
  Both views use same openSlot(day, slotType) handler and getSlot() lookup.
  Empty state (desktop only, hidden sm:flex) only shown when slots.length === 0.
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
  Each suggestion stores a target day + target slot so approval can place it directly onto the planner
  Suggestion cards show target day/slot and ingredient chips when present
  Admin sees "Add to bank", "Add to day", and "Reject" actions
  "Add to bank": orange slab button, opens confirm Dialog before saving to meal bank
  Add to bank confirm Dialog: shows meal name in quotes, explains it stays open until placed on a day or rejected
  "Add to bank" button is disabled (opacity 50) when suggestion status is already "in_bank"
  "In meal bank" badge: BookmarkCheck icon (16px, orange) + "In meal bank" text shown below meal name when status="in_bank"
  Accept confirm Dialog ("Add to day"): shows meal name bold, target day/slot, explains it will be placed on the planner and saved to the meal bank
  SuggestionSheet collects: meal name, target day, target slot, ingredients, note, prep time
  Accepting a suggestion invalidates ["suggestions"], ["meals"], and ["planner"] query keys
  Suggestion status semantics:
    "suggested"  = freshly submitted, not acted on
    "in_bank"    = added to meal bank only; card stays visible, still voteable and placeable
    "accepted"   = placed on the planner; removed from suggestions list
    "rejected"   = rejected by admin; removed from suggestions list
  GET /api/meals/suggestions filters WHERE status IN ("suggested", "in_bank")
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
- Pagination: each section (overdue/today/upcoming/noDueDate/completed) uses usePaginatedList with pageSize 15.
  ShowMoreButton renders below each section's task list. Auto-resets on filter change because items identity changes.

## Pagination Pattern (shared across pages)
- Hook: usePaginatedList<T>(items, { pageSize }) in src/lib/hooks/use-paginated-list.ts
- Component: ShowMoreButton in src/components/ui/show-more-button.tsx
- pageSize defaults to 15. Pass color={SECTION_COLOR} to tint the button.
- Hook auto-resets (via useEffect on items identity) when filter changes — no manual reset needed.
- Applied per-section on tasks page. Roll out to chores/notes/expenses/activity with same pattern.

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
- Grocery list pill row: wrapped in `relative` container. Scrollable div uses `overflow-x-auto scrollbar-none pb-3`.
  A `ResizeObserver` on the pill row detects overflow (pillOverflows state). When overflowing, an animated
  progress indicator bar (`h-1`, `COLOR + '20'` track, `COLOR` thumb) is shown at the bottom via `absolute bottom-0`.
  Thumb width = clientWidth/scrollWidth ratio; offset tracks scroll position proportionally.
  Animated with framer-motion spring (stiffness 300, damping 30). Hidden entirely when all pills fit.

## Receipt Scanning Rules
- Uses Azure Document Intelligence prebuilt-receipt model via /api/expenses/scan (premium + non-child only)
- SDK: @azure/ai-form-recognizer — DocumentAnalysisClient, AzureKeyCredential, beginAnalyzeDocument
- Returns structured JSON directly (no custom regex parser) — handles all receipt formats automatically via ML
- Free tier: 500 scans/month on F0 pricing tier
- Env vars required: AZURE_DOCUMENT_INTELLIGENCE_KEY, AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  Both must be added to Vercel dashboard before deploying
- Images converted to base64 client-side before POST (fileToBase64 in src/lib/utils/imageUpload.ts)
- Max image size: 10MB. Accepted types: jpg, png, webp, heic
- Mobile: camera input uses capture="environment". Desktop: file picker, no capture attribute
- Both paths send JSON { imageBase64 } to the same /api/expenses/scan endpoint
- ReceiptScanner shows a photo tips overlay once per session (sessionStorage key "roost-receipt-tips-dismissed")
  Tips: Sun (good lighting), Maximize2 (camera above), Square (plain dark surface), Crop (full receipt in frame)
  Dismissing tips auto-triggers the camera or file input the user originally tapped
- Line items are editable (description + amount) in LineItemEditor before confirming
- Per-item assignment: assignedTo[] empty = split equally, non-empty = split among those members
- "Or enter items manually" skips scanning and goes straight to LineItemEditor with empty lineItems
- After LineItemEditor confirm: title, amount, and customSplits auto-filled in ExpenseSheet form
- receipt_data stored as JSON string in expenses.receipt_data column (schema already had this column)
- Expense list rows with receipt_data show a small green Receipt icon badge next to the title
- View mode shows collapsible "Receipt items" section when receipt_data has lineItems
- Expense amount pre-fill uses receipt.total (after tax) ?? receipt.subtotal ?? item sum (ExpenseSheet.tsx handleLineItemsConfirmed)
- LineItemEditor "Receipt total (after tax)" label uses receipt.total
- Empty scan results (Azure worked, 0 items) show 'empty' state (amber) with "Add items manually"
  button, NOT the error state — error state is only for actual API/network failures
- API always returns 200 with the ParsedReceipt even when lineItems is empty; includes
  warning field when empty: { receipt, warning: "No items detected..." }
- Never throw errors for empty line items — empty is valid, user adds manually in LineItemEditor
- Google Vision: removed entirely (googleVision.ts deleted, GOOGLE_VISION_API_KEY no longer used)

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
- Child accounts require a row in BOTH the better-auth "user" table AND the Drizzle "users" table.
  The add-child route inserts into "user" first (FK requirement for session creation), then "users".
  Any future tooling that creates child accounts must do both inserts in this order.
  Placeholder email format: child_${userId}@roost.internal (satisfies NOT NULL unique constraint on "user".email).
## Routing Rules (src/proxy.ts)
- / is always public, never redirected, no auth check
- /login, /signup, /child-login are public; if already signed in, redirect to /dashboard
- All /(app)/* routes require auth; if not signed in, redirect to /login with callbackUrl
- /onboarding requires auth; un-onboarded users are held here until they create or join a household
- Onboarding guard: authenticated users with onboarding_completed=false are redirected to /onboarding from any app route
  ONBOARDING_BYPASS=["/onboarding"] prevents the redirect loop
  onboarding_completed is encoded in the session via better-auth user.additionalFields (no extra DB call in proxy)
  Household create and join routes set onboarding_completed=true on both the "user" (better-auth) and "users" (app) tables
  Onboarding page calls GET /api/auth/get-session?disableCookieCache=true after success to flush the 5-min cookie cache
  Existing users with a household were backfilled to onboarding_completed=true at migration time
- API routes (/api/*) bypass middleware entirely and handle their own auth (return 401/403, not redirect)
- Public assets (/brand/*, /images/*, static files) bypass middleware via matcher config

## Auth Page Layout
- Login and Signup: desktop = flex row split layout (40% red left panel, 60% form right panel)
- Left panel: red background #EF4444, flex col, justifyContent center, alignItems flex-start, padding 40px 36px
  - Brand block: next/image 42x42 rounded-xl + "Roost" wordmark (Nunito 900, 26px, white, tracking-tight) in a row
  - Below brand: "Home, sorted." at 13px/700/rgba(255,255,255,0.7), marginBottom 36px
  - 6 feature items: CheckSquare/ShoppingCart/DollarSign/CalendarDays/Coffee/PiggyBank icons
    Each: 28px circle bg rgba(255,255,255,0.18), 13px icon white; title 12px/800/white; desc 11px/600/rgba(255,255,255,0.62)/lineHeight 1.35
- Right panel: background #FFF5F5, centered form, max-width 400px, padding px-6 py-10 md:px-9
- Mobile: left panel hidden (hidden md:flex), right panel full width on #FFF5F5
- Mobile-only logo block: flex md:hidden, row layout (40px image borderRadius 10px + "Roost" Nunito 900) at top of form
- Labels: 11px font-weight 800 uppercase letterSpacing 0.07em color #7A3F3F
- Inputs: border 1.5px solid #F5C5C5, borderBottom 3px solid #DBADB0, borderRadius 12px, bg white
- H1: color #1A0505, letterSpacing -0.5px; Sub: color #7A3F3F
- Submit button: background #EF4444, border none, borderBottom 3px solid #C93B3B, borderRadius 14px
- Login "Forgot password?" link: href /forgot-password, 12px/700/#EF4444
- Signup step indicator: 3 pills (28px x 5px, borderRadius 3px, gap 6px, centered above H1)
  Pill 1 done: #C93B3B, Pill 2 active: #EF4444, Pill 3 inactive: #F5C5C5 (static visual only)
- Child login: no split layout, single centered column, max-width 360px, background #FFF5F5
  Logo: next/image 56x56 borderRadius 16, "Roost" wordmark 22px/900/#1A0505 below
  H1 "Hey! Enter your code." 26px/900/#1A0505; Sub "Your household code and your secret PIN." 13px/600/#7A3F3F
  Code input: height 64, border 2px solid #F5C5C5, borderBottom 4px solid #DBADB0, borderRadius 14, fontSize 22/900, letterSpacing 6px
  "Let me in" button: height 56, border none, borderBottom 4px solid #C93B3B, borderRadius 16
  Back link: "Back to grown-up sign in", 12px/700/#9B6060
  PIN dots: 18px each, gap 12px; filled = #EF4444, empty = #F5C5C5
  PIN pad buttons: white bg, border 1.5px solid #F5C5C5, borderBottom 3px solid #D4CFC9

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
- Settings page sections: Profile (avatar color, name, email, timezone, password change), Appearance (theme grid), Preferences (temperature unit, location, language), Household (rename, invite code, transfer admin), Members (all roles — admin sees interactive list with MemberSheet; non-admins see read-only list with name + role badge), Notifications (info text only: push notifications coming in iOS/Android apps, no toggles), Promotions (promo code redemption input + active promo status cards), Billing (plan status, upgrade), Danger Zone (admin only, delete data, delete household).
- MemberSheet (admin only): role changes, 12 permission toggles, child PIN change (nested sheet), allowance config (child only), remove member. Child-locked permissions rendered as disabled switches.
- The 12 member permissions: expenses.view, expenses.add, chores.add, chores.edit, grocery.add, grocery.create_list, calendar.add, calendar.edit, tasks.add, notes.add, meals.plan, meals.suggest
- Add flow pattern per feature page:
    Grocery: quick add bar at top for fast adds (h-14, amber border, cycling placeholder).
      Top-right + opens GroceryItemSheet for detailed add with name + quantity.
      No FAB on grocery page.
    Chores: + button lives in the page header (top-right), NOT a FAB. Same h-10 w-10 icon-only slab pattern as Tasks.
      History and Leaderboard buttons are icon-only on mobile (md:hidden), text+icon on desktop (hidden md:flex).
      No FAB on chores page.
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
  Receipt scanning: DONE, Azure Document Intelligence prebuilt-receipt, editable line items, per-member assignment
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
AZURE_DOCUMENT_INTELLIGENCE_KEY
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
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
  MULTIPLE_LISTS_PREMIUM, RECURRING_EXPENSES_PREMIUM,
  RECEIPT_SCANNING_PREMIUM, EXPORT_PREMIUM, ALLOWANCES_PREMIUM, CHILDREN_LIMIT,
  CHORE_HISTORY_PREMIUM
- Mutation error propagation: `const err = new Error(msg) as Error & { code?: string }; err.code = data.code; throw err;`
- Sheet onError: if (err.code && onUpgradeRequired) { onUpgradeRequired(err.code); return; }
- Page pattern: upgradeCode state + `{!!upgradeCode && <PremiumGate feature="X" trigger="sheet" onClose={() => setUpgradeCode(null)} />}`
- All 7 sheet components (ChoreSheet, TaskSheet, ReminderSheet, MealSheet, SuggestionSheet, EventSheet, NoteSheet) have onUpgradeRequired?: (code: string) => void prop
- PremiumGate is the ONLY gate component (UpgradePrompt deleted). Props: feature (PremiumGateFeature), trigger ('sheet'|'inline'|'page'), onClose? 
  - sheet: renders as Sheet+SheetContent drawer
  - inline: renders as a div block within parent layout (e.g. inside another sheet)
  - page: renders as centered full-page gate with back arrow
- PREMIUM_GATE_CONFIG in src/lib/constants/premiumGateConfig.ts drives all gate content
- Chores: daily = free, weekly/monthly/custom = premium (Lock icon shown on premium freq buttons)
- Leaderboard button: Lock icon shown + clicking shows PremiumGate feature="chores" trigger="sheet" when not premium
- History button: always shown in chores header (no lock), premium gate is on the history page itself via PremiumGate trigger="page"
- Chore history date filtering: parse date strings with `new Date("${dateStr}T00:00:00")` (no Z) to get local midnight, then use date-fns startOfDay/endOfDay. Using `new Date("2026-04-08")` parses UTC midnight — setHours() then breaks on non-UTC servers.
- Chore history users join: leftJoin (not innerJoin) so completions are never silently dropped if a users row is missing
- Grocery: pill row shows for (isPremium || lists.length > 1); + button shows Lock icon for free users
- Settings theme picker: all themes are free, no lock UI, selecting any theme calls setTheme() directly
- Expenses: free users see inline upgrade pitch card (no blurred preview), premium users see full module
- Sign out: AlertDialog confirmation in both Sidebar (desktop) and BottomNav More sheet (mobile)
  Calls applyTheme(DEFAULT_THEME) BEFORE signOut() to immediately reset CSS vars, then router.push('/login'), no toast on success
  This prevents midnight theme bleeding into the login page or a new user's session
- Theme on signout: always reset to DEFAULT_THEME immediately in handleSignOut (both Sidebar and BottomNav)
  Do NOT wait for page reload — call applyTheme(DEFAULT_THEME) synchronously before signOut()
- ThemeProvider does NOT read from localStorage. Theme comes exclusively from the server-side initialTheme prop
  (read from users.theme in DB in RootLayout). New users without a users row get DEFAULT_THEME.
- users.theme DB default is 'default' (not 'warm' or any removed theme). Unknown theme keys resolve to DEFAULT_THEME.
- Onboarding page background: #FFC8C8 (light pink). Content card: #C41E1E (dark red), borderRadius 24px.
  All text on the card uses white/rgba-white (never CSS variables). Option cards are white (#ffffff) with
  red-tinted icon boxes. Inputs use rgba-white border/background. Logo: icon-only (wordmark={false}).
- Onboarding CTA buttons (Create/Join): #EF4444 bg, white text — unchanged from before.
  "Go to dashboard" button: #ffffff bg, #C41E1E text (matches card-on-card white treatment).
- RoostLogo wordmark prop: boolean, defaults to undefined (treated as true). Pass wordmark={false} to
  render the icon only and suppress the "Roost" text span. Does not affect showWordmark behavior.

## Session Handoff
At the start of each new session fetch this file to restore context.
Share GitHub file URLs, paste code, or describe what was built.
Update this file after every major decision or completed phase.
## Rewards System Rules
- Rewards are premium only (enforced via household subscription_status)
- reward_rules table: one row per rule (admin creates, one per child+title combo, unique(household_id, user_id, title))
  - reward_type: "money" | "gift" | "activity" | "other"
  - period_type: "week" | "month" | "year" | "custom" (custom uses period_days)
  - threshold_percent: 50-100, the completion % required to earn the reward
  - starts_at: anchor date for custom periods
- reward_payouts table: one row per child per period per rule, unique(household_id, user_id, rule_id, period_start)
  - acknowledged: bool, child taps "Claim reward" to set true (PATCH /api/rewards/payouts/[id])
- Cron runs nightly at 11pm UTC via /api/cron/rewards, secured with CRON_SECRET
  The cron evaluates the just-completed period for each rule and creates payouts
- vercel.json cron: /api/cron/rewards runs "0 23 * * *" (nightly, not just Sunday)
- Admin manages rewards from two surfaces:
  1. Inline Rewards section at the bottom of the Chores page (quick overview + add/edit)
  2. Dedicated Rewards page at /chores/allowances (full-page management with explainer, per-rule progress, enable/disable toggle)
  Both surfaces open RewardRuleSheet for create/edit.
  "Rewards" button in the chores header navigates to /chores/allowances (or shows upgrade gate for free users)
- RewardRuleSheet (src/components/chores/RewardRuleSheet.tsx): create/edit sheet; props: open, onClose, rule, members (child array)
- RewardsWidget (src/components/shared/RewardsWidget.tsx): child-facing dashboard widget
  - Query key: ["rewards-child"], fetches /api/rewards/child
  - Shows unacknowledged earned payouts as green "Claim reward" cards
  - Shows active rules with progress bars
  - Shows recent payout history
- getPeriodBounds() exported from src/app/api/rewards/route.ts: returns {start, end} for current period
  Used by child route and cron. The cron uses separate getCompletedPeriodBounds() for the previous period.
- Earned money rewards create a real expense entry (paid_by = admin, split = child owes admin)
  This means earned money rewards appear in the settle-up flow automatically
- Completion rate = (completions in period) / (total assigned chores) * 100
  If no chores assigned, completion rate = 100 (reward always earned)
- Children see RewardsWidget on dashboard (only when enabled rules exist for them, and only if premium)
- Activity types: allowance_earned (green dot, maps to expenses), allowance_missed (amber dot)
- ["rewards-child"] query must be invalidated whenever a chore is completed or unchecked.
  Both completeMutation.onSettled and uncheckMutation.onSuccess in chores/page.tsx do this.
- MemberSheet settings section for child accounts shows an info callout pointing to the Chores page
  instead of the old allowance form. Allowance config is no longer in MemberSheet.
- Old tables (allowance_settings, allowance_payouts) remain in schema for migration safety but are unused

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
- Expenses free-tier shows PremiumGate feature="expenses" trigger="inline" (no blurred preview)
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
- Fixed seed accounts replace timestamp-email pattern. Do NOT use timestamp emails in new tests. Only onboarding.spec.ts legitimately needs fresh accounts.
- Seed accounts: admin.free@roost.test (free admin, Roost Free House), admin.premium@roost.test (premium admin, Roost Premium House), member@roost.test (member in free house), Test Child (child in free house, PIN 1234). All passwords: RoostTest123!
- src/db/seed.ts: idempotent seed script, run via `npm run db:seed`. Uses hashPassword from better-auth/crypto for correct scrypt format. tsx --env-file=.env.local loads env vars.
- e2e/global-setup.ts: runs seed then saves auth state (free-admin.json, premium-admin.json) to e2e/.auth/ via chromium login. Playwright starts webServer before globalSetup so server is available.
- playwright.config.ts projects: free (navigation/chores/grocery, storageState free-admin), premium (premium.spec, storageState premium-admin), unauthenticated (auth/onboarding, no storageState), mobile + mobile-premium counterparts.
- e2e/.auth/*.json files contain session tokens — always in .gitignore, never commit. e2e/.auth/.gitkeep tracks the empty directory.
- Empty-state tests (chores/grocery) only reliable on first run against a clean DB. Test data accumulates with shared accounts — this is an accepted tradeoff.

Last updated: 2026-04-13 (Promo code system built. Schema: promo_codes + promo_redemptions tables in src/db/schema/promoCodes.ts; db:push applied. requirePremium() in helpers.ts fixed to check premium_expires_at with lazy cleanup (reverts expired premium to free on check). Admin panel: Promo Codes tab added to nav in layout.tsx; full management page at /admin/promo-codes with create form, filter tabs, status actions. Admin API: GET+POST /api/admin/promo-codes, PATCH /api/admin/promo-codes/[id]. User API: POST /api/promo-codes/redeem (validates code, checks duplicates, extends existing promo expiry, respects active Stripe subs), GET /api/promo-codes/status. Settings page: Promotions section added above Billing with code input, redeem button, active promo status cards. NAV_SECTIONS gains section-promotions entry.)

Previous: 2026-04-13 (Onboarding guard added. onboarding_completed: boolean added to both "user" (better-auth) and "users" (app) tables; db:push applied; existing users with a household backfilled. better-auth user.additionalFields configured so session.user.onboarding_completed is available in proxy.ts without a DB call. Household create and join routes set the flag on both tables via Promise.all. Onboarding page calls GET /api/auth/get-session?disableCookieCache=true after success to flush the 5-min cookie cache before navigating to /dashboard. proxy.ts: ONBOARDING_BYPASS=["/onboarding"] + guard block after auth check redirects un-onboarded users to /onboarding.)

Previous: 2026-04-10 (Child auth bug fixes. add-child route now inserts into better-auth "user" table BEFORE inserting into app "users" table so createSession() FK constraint is satisfied. Placeholder email child_${userId}@roost.internal used for the "user" row. child-login POST: split combined !member || !member.pin check into two distinct 401 responses ("Invalid PIN" vs "No PIN set. Ask a parent to set one in Settings."). Debug console.log removed. Key Rules updated with dual-table child account requirement.)

Previous: 2026-04-09 (Child auth system built. Schema: users.ts gained is_child_account, child_of_household_id, has_seen_welcome. API: POST /api/household/members/add-child (admin only, generates 4-digit PIN, hashes it, creates child user + household_member); GET /api/auth/child-login (public, returns children list by householdCode); POST /api/auth/child-login rewritten to take {householdCode, childId, pin} — targets specific child; POST /api/user/dismiss-welcome sets has_seen_welcome=true. child-login page fully rewritten: 3-step flow — (1) house code input with cookie persistence (365-day), (2) name picker grid, (3) PIN pad with auto-submit + shake on wrong PIN. AddChildSheet: 2-step form/PIN-reveal. WelcomeModal: shadcn Dialog shown once on dashboard for new users. Settings Members section gains "Add Child Account" button + callout. FREE_TIER_LIMITS.children = 2. Run npm run db:push to sync schema.)

Previous: 2026-04-09 (Sidebar footer redesigned: replaced Settings nav link + user-info row + sign-out button with a single clickable user block (button → router.push('/settings'), padding 10px 8px, borderRadius 14, hover var(--roost-bg), contains 34px avatar + name/role + 15px gear icon) and a separate sign-out button below (34px height, red hover tint, 12px/700 font, 13px LogOut icon). The Settings nav link is gone — the user block navigates to /settings and highlights when pathname==='/settings'. Avatar color sync fixed: root cause was a source mismatch — avatar_color lives in the custom users table, not in better-auth's user table, so useSession() never contained it. Sidebar now reads avatar_color from a useQuery(["user-profile"]) against /api/user/profile (same key settings/page.tsx already invalidates on save) instead of casting the session object. No authClient.getSession() call needed — TanStack Query invalidation is the correct mechanism.)

Previous: 2026-04-09 (Billing page current plan card redesigned. Free tier: icon box (48px, Home icon) + plan name + "Free forever" badge in top section; divider; 4 usage progress bars in bottom section (Chores/Members/Grocery lists/Reminders, each with label + "X / Y used" count + colored fill bar). Premium tier: same top section with "Active" green badge + Cancel/Reactivate links; divider; "Next billing date" or "Premium ends" row. UsageItem interface + UsageRow component + CurrentPlanCard component added. 4 useQuery hooks added for real usage data (chores, household-members, grocery-lists, reminders). Progress bar colors: chores #EF4444, members #3B82F6, grocery #F59E0B, reminders #06B6D4.)

Previous: 2026-04-09 (Themes are free: removed "themes" from PREMIUM_GATE_CONFIG, removed premium gate block from /api/user/theme/route.ts, removed PREMIUM_THEMES and premiumThemes flag from freeTierLimits.ts, removed "All app themes unlocked" from billing page Household extras card, removed Palette import from premiumGateConfig.ts. ALL_THEMES now equals ["default", "midnight"] with no premium split. THEMES_PREMIUM error code no longer exists.)

Previous: 2026-04-09 (Billing page fully redesigned. New layout: current plan card (2-col with status pills), premium hero card ($4 price + value pill + upgrade button + maybe later), "Everything that's included" section label, feature grid (8 feature cards from PREMIUM_GATE_CONFIG + Household extras full-width card), bottom CTA card. Feature cards show icon box (featureHex + '1A' bg) + name + perk rows (14px circle checkmark). HouseholdExtrasCard spans full grid width with Home icon and 2-col perk grid. Premium state hides hero + bottom CTA, shows Active badge + Billed monthly pill + Cancel plan/Reactivate links in plan card. All Stripe logic (handleCheckout, handleReactivate, handleCancel, handlePortal, cancel flow sheet) preserved unchanged. UpgradeButton reusable sub-component shared by hero + bottom CTA. Removed SlabCard dependency.)

Previous: 2026-04-09 (premiumGateConfig.ts perk strings rewritten to natural sentence grammar. All em dashes removed from perks, valueProp, and subtitles in the config. valueProp period replaces em dash: "...entire household. That's less than..." Subtitles: "Set it and forget it. Roost handles the nagging." and "Detailed stats across every feature: chores, expenses, tasks, and more.")

Previous: 2026-04-09 (Premium gate unification: UpgradePrompt.tsx deleted. PremiumGate now handles all 3 trigger variants (sheet/inline/page) via single component. PREMIUM_GATE_CONFIG in src/lib/constants/premiumGateConfig.ts drives all gate content, 13 feature slugs. Price updated $3 to $4/month across all UI copy, CLAUDE.md, FEATURES.md, billing page. usePaginatedList hook (src/lib/hooks/use-paginated-list.ts) + ShowMoreButton (src/components/ui/show-more-button.tsx) added for per-section task pagination. Grocery pill row: native scrollbar replaced with animated scroll progress indicator. Expenses: tab active = green COLOR; stat card heights fixed; dot pagination uses progress-based index; billing page CTA uses boxShadow slab style.)

Previous: 2026-04-09 (Admin panel fixes: 1) /admin overview navbar was missing — root cause: window.location.href=="/admin" needed (not router.push) after login to force full RSC reload; proxy.ts was setting x-pathname on response headers instead of request headers (server components read request headers via headers()). Fixed by rewriting proxy.ts to use NextResponse.next({ request: { headers: requestHeaders } }) pattern via nextWithPathname() helper. 2) total_users = 0 — stats route was querying better-auth "user" table; all dev/test accounts matched test filter patterns so result was 0. Fixed by switching all user count queries in stats/route.ts from "user" (better-auth) to users (app table, has deleted_at). Now consistent with admin/users route. 3) Hide test accounts filter — testFilters.ts created as single source of truth. All 3 API routes + pages have hideTest toggle, localStorage persistence, mounted guard.)

Previous: 2026-04-09 (Admin panel built at /admin. Separate from better-auth — uses jose JWT in HttpOnly cookie (8h, HS256). Env vars: ADMIN_EMAIL + ADMIN_PASSWORD. Files: src/lib/admin/auth.ts (createAdminSession, verifyAdminSession, checkAdminCredentials), src/lib/admin/requireAdmin.ts (requireAdminSession returns Response|null), src/app/api/admin/login/route.ts (POST, sets cookie), src/app/api/admin/logout/route.ts (POST, clears cookie, redirects), src/app/api/admin/stats/route.ts (GET: overview stats + signupsOverTime + conversionsOverTime via 5 parallel sql queries; queries "user" table quoted), src/app/api/admin/users/route.ts (GET: paginated, search, filter, returns camelCase), src/app/api/admin/households/route.ts (GET: paginated, search, filter, ARRAY_AGG member emails, returns camelCase), src/app/api/admin/households/[id]/route.ts (PATCH: set premium/free, COALESCE subscription_upgraded_at, logActivity). proxy.ts: /admin added to SKIP_PREFIXES. src/app/(admin)/layout.tsx: server component, reads x-pathname header, skips auth for /admin/login, dark #0F172A theme, sticky nav. src/app/(admin)/admin/login/page.tsx: centered dark card, #6366F1 branding. src/app/(admin)/admin/page.tsx: overview with 6 stat cards + 2 Recharts AreaCharts. src/app/(admin)/admin/users/page.tsx: table with search/filter/pagination/expandable rows + CopyField. src/app/(admin)/admin/households/page.tsx: table with Set Premium/Set Free action + ConfirmDialog + optimistic update + expandable rows. Schema: households.subscription_upgraded_at added. Roadmap item 8 marked DONE.)

Previous: 2026-04-09 (Custom chore categories built. Schema: chore_categories table (id, household_id, name, icon, color, is_default, is_custom, suggested_by, status). chores.category_id FK added. db:push applied. seedChoreCategories.ts: 8 defaults seeded idempotently (Kitchen/Bathroom/Bedroom/Outdoor/Laundry/Pet Care/Errands/Other). household/create/route.ts: calls seedChoreCategories on household creation. API: GET /api/chore-categories (free, auto-seed, returns active+pending for admins); POST /api/chore-categories (admin+premium, create); POST /api/chore-categories/suggest (member+premium, status=pending); PATCH/DELETE /api/chore-categories/[id] (admin only, approve/reject/edit/delete). chores GET: leftJoin chore_categories, returns category:{id,name,icon,color}|null. chores POST/PATCH: accept category_id. choreIconMap.ts: CHORE_ICON_MAP with 29 verified Lucide icons + CHORE_ICON_OPTIONS. ChoreCategoryPicker.tsx: None tile + defaults grid + custom grid + inline create/suggest form; premium-gated form calls onUpgradeRequired. ChoreSheet: category_id in ChoreData, ChoreCategoryPicker field between description and assign-to. chores/page.tsx: choreCategories query, category filter pills, category badge on ChoreItem rows. settings/page.tsx: ChoreCategoriesSettingsSection (edit/delete custom, approve/reject suggestions); Chore Categories nav item. UpgradePrompt: CHORE_CATEGORIES_PREMIUM entry added. Roadmap item 7 marked DONE.)

Previous: 2026-04-10 (Suggested Meals flow updated. Existing meal suggestions were converted from pending/approved into suggested/accepted/rejected. meal_suggestions now stores target_slot_date + target_slot_type so each suggestion can aim at a specific planner day, plus responded_by/responded_at and accepted_meal_id/accepted_slot_id for auditability. New routes: POST /api/meals/suggest alias, PUT /api/meals/[id]/accept, DELETE /api/meals/[id]/reject. GET /api/meals/suggestions now returns target day/slot and only active suggested items. Accepting a suggestion creates a real meals row, upserts the planner slot, marks the suggestion accepted, and invalidates suggestions/meals/planner queries. SuggestionSheet now collects meal name, ingredients, target day, target slot, note, and prep time. Suggestions tab cards show the target day/slot and ingredient chips, and admins can Add to day or Reject directly from the list.)

Previous: 2026-04-09 (Guest/temporary member feature built. Schema: household_invites table (token, email, is_guest, expires_at, link_expires_at, accepted_at, accepted_by_user_id). household_members gains expires_at nullable timestamp. db:push applied. inviteToken.ts utility: generateInviteToken() + getInviteUrl(). API: POST /api/household/invite (admin+premium, creates invite with 7-day link expiry), GET+POST /api/invite/[token] (public GET checks validity; POST joins as guest role with 12 default permissions), GET /api/cron/guest-expiry (daily 2am UTC, hard-deletes expired guests). Middleware: /invite/ added to SKIP_PREFIXES for public access. Auth pages: signup/login read ?invite= param → sessionStorage pendingInviteToken → redirect to /invite/[token] post-auth. Guest role: expenses.view/add=true, grocery.add=true, calendar.add=true, tasks.add=true, meals.suggest=true; everything else off. requireHouseholdMember throws 403 GUEST_EXPIRED for expired guests. getUserHousehold returns null for expired guests (all routes block naturally). Settings page: "Invite Guest" button in Members section (admin only; opens InviteGuestSheet if premium, UpgradePrompt GUEST_MEMBER_PREMIUM if not). Guest members show amber pill badge "Guest · expires in X days". Invite page (/invite/[token]) outside app shell: shows household name, amber guest badge, 5 capability bullets, join/signup/login buttons. InviteGuestSheet: email optional, preset expiry pills, custom date, copy+share. vercel.json: guest-expiry cron added. FEATURES.md: Guest/Temporary Member moved to BUILT. Roadmap item 5 marked DONE.)

Previous: 2026-04-09 (Rich text notes built. Tiptap v2 installed (@tiptap/react, starter-kit, extension-link, extension-task-list, extension-task-item, extension-placeholder, extension-code-block, extension-blockquote, extension-heading). RichTextEditor component: toolbar (bold/italic/strike, H1-H3, bullet/ordered/task lists, blockquote, code block, link/unlink, undo/redo), editable + hideToolbar props. Premium users see RichTextEditor in NoteSheet create/edit/view. View mode: hideToolbar=true + editable=true so checkboxes work, debounced 500ms auto-save on change. Free users keep plain textarea unchanged + upgrade nudge banner below. NoteCard in notes/page.tsx: detectHtml() + stripHtml() for correct card preview; "Rich" badge shown on HTML notes. API limits raised from 1000 to 50,000 chars; empty check updated for Tiptap empty state (<p></p>); no .trim() on HTML content. UpgradePrompt: RICH_TEXT_NOTES_PREMIUM added (FileText icon). Roadmap item 4 moved from PLANNED to DONE. Error codes: RICH_TEXT_NOTES_PREMIUM added.)

Previous: 2026-04-09 (Household stats page built at /stats. Premium-only with full-page PremiumGate. API: GET /api/stats accepts start/end ISO date params, requires premium, runs 22 parallel SQL aggregation queries (Promise.all) covering chores, expenses, tasks, meals, grocery, activity, household. Uses Drizzle sql template for GROUP BY, COUNT FILTER, DATE_TRUNC, COALESCE. Response shape: {chores: {totalCompletions, completionsPerMember, mostCompletedChore, completionsOverTime, pointsPerMember}, expenses: {totalSpent, byCategory, overTime, settledVsUnsettled}, tasks: {totalCreated, totalCompleted, completionRate, overdueCount, byPriority}, meals: {totalPlanned, mostPlannedMeal, suggestions}, grocery: {itemsAdded, itemsChecked, checkRate, mostAddedItem}, activity: {mostActiveMember, byTypeGroup}, household: {memberCount, members, oldestMember, householdAge}}. Page: date range presets (7d/30d/90d/year/custom), 6 stat cards (chores/expenses/tasks/meals/grocery/most-active), 6 Recharts charts (AreaChart for chore completions + spending over time, DonutChart for spending by category + task priority, horizontal BarChart for chores by member + activity breakdown), member overview table with completion+points, household footer. Navigation: Stats added to Sidebar NAV_ITEMS, BottomNav MORE_ITEMS, Dashboard TILES, PremiumGate feature map. colors.ts: stats: #6366F1 added to SECTION_COLORS. Roadmap item 3 moved from PLANNED to DONE.)

Previous: 2026-04-09 (Recurring calendar events built. Schema: calendar_events gains recurring (bool, default false), frequency (text), repeat_end_type (text), repeat_until (timestamp), repeat_occurrences (integer). db:push applied. Architecture: expand-on-fetch — no child rows, no cron. recurrence.ts utility: expandRecurringEvent() + expandEventsForRange(). GET /api/calendar: two queries (non-recurring in range + all recurring templates), expanded and merged. POST: saves all recurrence fields, validates frequency required when recurring, validates end condition. PATCH: accepts recurring fields, updates template row (all instances update automatically). CalendarEventFull gains: recurring, frequency, repeat_end_type, repeat_until, repeat_occurrences, isRecurring, template_start_time. EventSheet: RecurringFields sub-component (repeat toggle, 5 frequency pills, 3 end-type pills, until-date input, after-N-occurrences input). Edit mode uses template_start_time as anchor date. Delete dialog updated for recurring events. All event renders (month grid, mobile list, agenda, DaySheet) show Repeat icon on recurring instances. Event keys use id+start_time composite to handle duplicate IDs across recurring instances. Premium gate: toggling repeat on while free calls onUpgradeRequired("RECURRING_EVENTS_PREMIUM"). Roadmap item 2 moved from PLANNED to BUILT.)

Previous: 2026-04-09 (Product roadmap documented. Added ## Product Roadmap section to CLAUDE.md with 8 prioritized web features (premium themes, recurring calendar events, household stats page, rich text notes, guest member, grocery smart sort, custom chore categories, superadmin panel) and platform phase (iOS, Android, ambient mode, i18n). FEATURES.md planned section replaced with structured near-term list matching roadmap priority order. Paywall copy added for household stats, guest member, custom categories, and rich text notes gates.)

Previous: 2026-04-09 (Premium limit centralization pass. freeTierLimits.ts expanded: PREMIUM_TIER_LIMITS, PREMIUM_FEATURES, FREE_THEMES, PREMIUM_THEMES, ALL_THEMES, Theme type, getLimit(), isPremiumFeature() helpers. All 6 API routes (chores, tasks, calendar, reminders, meals, household/join) fixed to use FREE_TIER_LIMITS constants instead of raw numbers in error responses. MealSheet client-side hardcode fixed. child limit (children: 1) now enforced in role assignment route via new checkChildLimit() in premiumGating.ts. Theme route rewritten to import ALL_THEMES/PREMIUM_THEMES and enforce premium gate. Chore history error code standardized to CHORE_HISTORY_PREMIUM. UpgradePrompt gains CHILDREN_LIMIT entry (Baby icon). Error codes list updated: CHILDREN_LIMIT, CHORE_HISTORY_PREMIUM added. calendarEventsPerMonth renamed to calendarEvents; activeSingleReminders renamed to reminders in FREE_TIER_LIMITS.)

Previous: 2026-04-09 (Meals gating corrected. Meals module is FREE (planner, bank, suggestions, voting, grocery add). Only the 5-meal bank limit is premium-gated. Removed PremiumGate from meals/page.tsx. MealSheet gains isPremium + mealCount props; client-side pre-check blocks save at 5 meals and calls onUpgradeRequired("MEAL_BANK_LIMIT") before API call. Server-side check already existed in POST /api/meals via checkMealBankLimit. MEAL_BANK_LIMIT UpgradePrompt entry updated: icon UtensilsCrossed, new title/body. PremiumGate meals feature entry left in PremiumGate.tsx for future use but no longer triggered. FEATURES.md restructured: Meals (Free) added to free tier, Meals (Premium) now covers unlimited bank + smart suggestions only.)

Previous: 2026-04-08 (Premium gate audit + enforcement pass. New gates: expenses main page (PremiumGate), meals module (PremiumGate), ReceiptScanner (UpgradePrompt RECEIPT_SCANNING_PREMIUM), MemberSheet allowance section (UpgradePrompt ALLOWANCES_PREMIUM), AllowanceWidget returns null for free, ReminderSheet notify-household/specific locked (REMINDER_NOTIFY_PREMIUM). New UpgradePrompt codes: RECEIPT_SCANNING_PREMIUM, EXPORT_PREMIUM, ALLOWANCES_PREMIUM. PremiumGate gains meals feature. Removed custom free-tier pitch from expenses/page.tsx. REMINDER_NOTIFY_PREMIUM was already in UpgradePrompt map; now wired to UI. Streaks remain free.)

Previous: 2026-04-08 (Custom categories + budgets + insights complete. Schema: expense_categories (id, household_id, name, icon, color, is_default, is_custom, suggested_by, status), expense_budgets (id, household_id, category_id, amount, reset_type, warning_threshold, period_start, last_reset_at), expenses.category_id added. 10 default categories seeded on household create (and auto-seeded on first GET /api/expenses/categories for existing). API: GET/POST /api/expenses/categories, POST /api/expenses/categories/suggest, PATCH/DELETE /api/expenses/categories/[id], GET/POST /api/expenses/budgets, PATCH/DELETE /api/expenses/budgets/[id], POST /api/expenses/budgets/[id]/reset, GET /api/expenses/insights, GET /api/cron/budget-reset (1st of month midnight UTC). UI: CategoryPicker component (5-col grid, inline create/suggest form with 30 icons + 10 color swatches), ExpenseSheet uses CategoryPicker replacing hardcoded pills, /expenses/budget page with progress bars, AddBudgetSheet/EditBudgetSheet, /expenses/insights page with Recharts donut/line/bar charts, settings Categories section (admin only: edit/delete custom, approve/reject suggestions). Desktop header: Budget + Insights links. Mobile more menu: real navigation.)

## Recurring Expenses UX Patterns
- Premium + admin-only feature
- Template stores: title, category, frequency, splits (JSON), next_due_date, paused flag
- frequency options: weekly, biweekly, monthly, yearly
- Cron creates is_recurring_draft=true expense from template when next_due_date <= today
- Admin sees amber banner on expenses page when recurringDrafts.length > 0
- Banner opens RecurringDraftSheet: Post button (confirms draft, advances due date, notifies members) + Skip button (deletes draft, advances due date, no notification)
- ExpenseSheet create mode: "Repeat" toggle at bottom above save button
  - Locked with Lock icon for non-premium users (tap calls onUpgradeRequired)
  - Toggle on shows frequency pills + "First due" date input
  - Save creates template (POST /api/expenses/recurring) instead of one-off expense
  - Save button label changes to "Save Recurring" when repeat is on
- ExpenseSheet view mode: if expense.recurring_template_id set and template passed as prop, shows "Recurring" section with frequency + next due date
  - Admin sees Pause/Resume toggle + "Remove" (delete template, keep expense history)
  - remove triggers AlertDialog confirmation before DELETE
- advanceRecurringDate(from, frequency) helper exported from /api/expenses/recurring/route.ts
- recurringTemplates fetched via useQuery(["recurringTemplates"]) on expenses page (premium only)
- RecurringTemplate passed to ExpenseSheet as optional prop; looked up by recurring_template_id
- Expenses GET: filters out is_recurring_draft=true from main list; returns recurringDrafts[] separately
- Expense rows with recurring_template_id show small RefreshCw icon next to title
- RECURRING_EXPENSES_PREMIUM error code maps to PremiumGate feature="expenses" in expenses/page.tsx
- Expenses page has two tabs: "Expenses" (default) and "Recurring" (premium only)
- Tab row sits below the page header; slab pill buttons with dark active state
- Recurring tab shows: draft banner (admin, if drafts pending), summary stats row (active count, monthly total, next due), template list with 3-dot menu (Edit, Pause/Resume, Delete)
- Tapping a template card opens EditRecurringSheet; 3-dot menu has same actions inline
- Mobile header has ••• (MoreHorizontal) button that opens a sheet with: Spending insights (coming soon), Budgets (coming soon), Recurring expenses (switches to Recurring tab)
- Desktop header has Budget + Insights + Export buttons (Budget/Insights show "coming soon" tooltip, not yet built)
- PATCH /api/expenses/recurring/[id] now also accepts nextDueDate field for manual due-date override
- Draft banner moved to Recurring tab; RecurringTabView component defined in expenses/page.tsx

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
- STRIPE_PRICE_ID env var: the monthly $4 price ID (price_...) from Stripe dashboard

## Promo Code System
- Admin creates promo codes in /admin/promo-codes with: custom or auto-generated code, duration (30/60/90/180/365 days), optional max redemptions, optional code expiry date
- Users redeem codes in Settings > Promotions (above Billing section)
- Schema: promo_codes (id, code, duration_days, status, max_redemptions, redemption_count, expires_at, created_at) + promo_redemptions (id, promo_code_id, household_id, user_id, redeemed_at, premium_expires_at)
- Code status: 'active' | 'paused' | 'deactivated'; all transitions allowed (admin has full control)
- Redemption validation: code exists + status active + not expired + not at max redemptions + household hasn't already used this code
- On redeem: sets household subscription_status='premium', premium_expires_at = now + duration_days
- If household already has a future premium_expires_at (another promo), extends from that date instead of now
- If household has active Stripe subscription (stripe_subscription_id set, no expiry), promo records but premium_expires_at stays null (Stripe takes precedence)
- requirePremium() server-side now checks premium_expires_at and does lazy cleanup (reverts expired premium to free)
- Settings Promotions section: code input (auto-uppercase, monospace), Redeem button, active promo status cards with code/expiry/Active badge
- Info note below input: "When your promotion expires, your household will return to the free plan unless you subscribe."
- Admin API: GET/POST /api/admin/promo-codes, PATCH /api/admin/promo-codes/[id]
- User API: POST /api/promo-codes/redeem, GET /api/promo-codes/status
- Admin UI: indigo-accented create form, filter tabs (All/Active/Paused/Deactivated), table with copy button, status badges, action links
- Deactivated codes show with strikethrough and 50% opacity in the admin table
- Auto-generated codes: 8 chars from ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (excludes ambiguous chars I/O/0/1)

## Bugs Found and Fixed (2026-04-13)
- Child login PIN keypad immediately snapped back to the "Who are you?" picker after tapping a name.
  Root cause: `fetchChildren` was wrapped in `useCallback([step])` and a `useEffect([fetchChildren])`
  re-ran whenever `step` changed. Tapping a child set `step=3`, which recreated `fetchChildren`,
  which triggered the effect, which re-fetched children and called `setStep(2)` (multiple kids).
  Fixed by removing `step` from `fetchChildren` deps (replaced with an `isFromCookie` parameter)
  and pinning the cookie-restore effect to mount only (`[]` deps).
- "Wrong house?" button on child login step 2 was invisible: used `ROOST_BRAND_MUTED` (#7A3F3F)
  against `ROOST_BRAND_SURFACE` (#B91C1C) background. Changed to `rgba(255,255,255,0.8)`.
- Stray child initial character visible above PIN heading on step 3. Root cause: MemberAvatar
  used `ROOST_BRAND_BG` (#B91C1C) as fallback avatar color, identical to panel background
  `ROOST_BRAND_SURFACE` (#B91C1C). The circle blended in, leaving the white initial floating.
  Fixed by removing the MemberAvatar from step 3 entirely.
- No visible feedback after entering PIN. Root cause: loading spinner used `color: ROOST_BRAND_BG`
  (#B91C1C) on the same #B91C1C panel background (invisible). Error was only via toast at screen
  edge. Fixed: spinner color changed to white, added inline `pinError` state rendered as white text
  below the keypad on wrong PIN (replaces the toast).
- Child accounts redirected to /onboarding instead of /dashboard after login. Root cause: the
  add-child route did not set `onboarding_completed: true` on either the better-auth `user` or
  app `users` table. The proxy's onboarding guard saw `onboarding_completed=false` and redirected.
  Fixed in add-child route (both table inserts now set `onboarding_completed: true`). Added safety
  guard on the onboarding page itself: if `role === "child"`, immediately redirect to /dashboard
  (catches existing child accounts created before this fix).

## Bugs Found and Fixed (2026-04-08)
- Chore history showed 0 completions despite chores being completed on the main page.
  Two root causes in `src/app/api/chores/history/route.ts`:
  1. `innerJoin(users, ...)` dropped every completion row if the user's row was missing
     from the app `users` table (the auth databaseHook can fail silently on first signup
     before the table existed). Fixed by switching to `leftJoin` with `?? "Unknown"` fallback.
  2. `new Date(dateStr)` parses date-only ISO strings as UTC midnight; `setHours()` then
     applied LOCAL time offset, making the to-date inconsistent. Fixed by using
     `startOfDay`/`endOfDay` from date-fns with `T00:00:00` suffix to force local-time parsing.

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
