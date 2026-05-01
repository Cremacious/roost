# Requirements: Roost V2

**Defined:** 2026-05-01
**Core Value:** One household. One app. Everything works, everything connects, and nobody needs to be told how to use it.

---

## v1 Requirements (V2 Launch Scope)

### Foundation

- [ ] **FOUN-01**: Monorepo restructured to `apps/web/`, `apps/mobile/`, `packages/` using npm workspaces
- [ ] **FOUN-02**: Shared packages extracted: `packages/api-types` (response/request types), `packages/constants` (colors, limits), `packages/utils` (debt simplification, recurrence, grocery sort, time)
- [ ] **FOUN-03**: Schema migration strategy switched from `db:push` to `drizzle-kit generate` + `drizzle-kit migrate`
- [ ] **FOUN-04**: Neon database branch created for V2 development (isolated from production)
- [ ] **FOUN-05**: Rebuild branch (`rebuild/v2`) established; V1 stays live in production during development
- [ ] **FOUN-06**: EAS Build project configured for iOS and Android development builds
- [ ] **FOUN-07**: `getUserHousehold` moved from `src/app/api/chores/route.ts` to `src/lib/auth/helpers.ts`

### Information Architecture + Navigation

- [ ] **IA-01**: 5-tab navigation model implemented on all platforms: Today / Household / Food / Money / More
- [ ] **IA-02**: Today tab contains: chores due today, upcoming events (next 48h), grocery list preview, active reminders, household activity feed
- [ ] **IA-03**: Household tab contains: Chores + Tasks + Calendar
- [ ] **IA-04**: Food tab contains: Grocery + Meals (collocated, shared data)
- [ ] **IA-05**: Money tab contains: Expenses + Splitting + Settle-up
- [ ] **IA-06**: More tab/sheet contains: Notes, Reminders, Stats, Settings, Profile
- [ ] **IA-07**: Maximum 5 top-level navigation destinations; no feature gets its own top-level tab in the future without explicit product decision

### Onboarding

- [ ] **ONBR-01**: New user can complete household setup (create or join) in under 60 seconds
- [ ] **ONBR-02**: Guest/new member sees household preview (name, member count, recent activity) before being required to create an account
- [ ] **ONBR-03**: Onboarding asks for ONE piece of household identity (name), defers all other configuration
- [ ] **ONBR-04**: First meaningful action (add grocery item, mark chore done, or see events) available within the first session
- [ ] **ONBR-05**: Admin invite flow generates a shareable link that opens the household preview on web and deep-links into app if installed
- [ ] **ONBR-06**: Child account setup (add child, set PIN) is accessible from household settings within 2 taps of landing on settings

### Design System (V2)

- [ ] **DS-01**: Design language updated to Apple-native feel: content-first, restrained color use, clean typography
- [ ] **DS-02**: Section colors used as accents only (badges, active states, key CTAs) — not as dominant page identities
- [ ] **DS-03**: Typography tightened: Nunito weights 600/700/800 only; generous whitespace; hierarchy through scale, not color
- [ ] **DS-04**: Ad banner zone defined as a single contained component, never inline with content, never appearing during onboarding or critical flows
- [ ] **DS-05**: Framer-motion animations preserved and extended to all new surfaces (page enter, list stagger, press feedback)

### Authentication

- [ ] **AUTH-01**: Email/password signup and login (unchanged from V1)
- [ ] **AUTH-02**: Child account PIN login via household code (unchanged from V1)
- [ ] **AUTH-03**: Session persistence across app restarts on web and mobile
- [ ] **AUTH-04**: `@better-auth/expo` plugin configured; Expo client stores session in `expo-secure-store`
- [ ] **AUTH-05**: Expo auth client tested against production Vercel URL (not just dev environment)
- [ ] **AUTH-06**: Push notification permission requested after first chore completion or first reminder added (not during onboarding)

### Household Management

- [ ] **HSLD-01**: Household creation with invite code (unchanged from V1)
- [ ] **HSLD-02**: Join by invite code (unchanged from V1)
- [ ] **HSLD-03**: Member management: roles (admin/member/guest/child), per-user permission toggles (unchanged from V1)
- [ ] **HSLD-04**: Guest member invites with expiry (unchanged from V1)
- [ ] **HSLD-05**: Add child account with PIN from household settings (unchanged from V1)
- [ ] **HSLD-06**: Transfer admin, remove member, delete household (unchanged from V1)

### Chores

- [ ] **CHORE-01**: CRUD for chores with frequency, assignment, due date (unchanged from V1)
- [ ] **CHORE-02**: Complete and uncheck chores with optimistic UI (unchanged from V1)
- [ ] **CHORE-03**: Chore streaks and weekly leaderboard (unchanged from V1)
- [ ] **CHORE-04**: Custom chore categories and icons (unchanged from V1, premium)
- [ ] **CHORE-05**: Chore history page with member and date filters (unchanged from V1, premium)
- [ ] **CHORE-06**: Chore completion visible in Today tab for chores due today

### Child Rewards

- [ ] **RWD-01**: Admin creates reward rules per child (period, threshold, reward type)
- [ ] **RWD-02**: Child sees progress widget in Today/Dashboard view (unchanged from V1)
- [ ] **RWD-03**: Nightly cron evaluates completion and creates payouts (unchanged from V1)
- [ ] **RWD-04**: Earned money rewards appear in expense settle-up flow (unchanged from V1)

### Grocery

- [ ] **GROC-01**: Shared grocery list with item add, check/uncheck, clear checked (unchanged from V1)
- [ ] **GROC-02**: Quick-add bar for fast item entry (unchanged from V1)
- [ ] **GROC-03**: Multiple named grocery lists (premium, unchanged from V1)
- [ ] **GROC-04**: Smart sort by store section (client-side, unchanged from V1)
- [ ] **GROC-05**: Grocery list readable when offline (TanStack Query `networkMode: 'offlineFirst'` cache)
- [ ] **GROC-06**: Grocery preview card visible in Today tab

### Meals

- [ ] **MEAL-01**: Meal bank (CRUD for saved meals) (unchanged from V1)
- [ ] **MEAL-02**: Weekly meal planner (4 slots per day, Mon-Sun) (unchanged from V1)
- [ ] **MEAL-03**: Meal suggestions with voting (unchanged from V1)
- [ ] **MEAL-04**: Add meal ingredients to grocery list in one tap (unchanged from V1)
- [ ] **MEAL-05**: Meals collocated with Grocery in Food tab navigation
- [ ] **MEAL-06**: Tonight's meal shown in Today tab

### Calendar

- [ ] **CAL-01**: Month grid + agenda list views (unchanged from V1)
- [ ] **CAL-02**: Create/edit events with attendees (unchanged from V1)
- [ ] **CAL-03**: Recurring events (daily/weekly/biweekly/monthly/yearly) (unchanged from V1, premium)
- [ ] **CAL-04**: Upcoming events (next 48h) shown in Today tab
- [ ] **CAL-05**: Deep link from push notification to specific event

### Tasks

- [ ] **TASK-01**: CRUD for tasks with due date, priority, assignment (unchanged from V1)
- [ ] **TASK-02**: Complete tasks with confirmation; uncheck immediately (unchanged from V1)
- [ ] **TASK-03**: Tasks grouped by: Overdue, Due today, Upcoming, No date, Completed (unchanged from V1)
- [ ] **TASK-04**: Overdue tasks surfaced in Today tab

### Expenses

- [ ] **EXP-01**: Manual expense entry with 3 split methods (equal, custom, payer-only) (unchanged from V1)
- [ ] **EXP-02**: Debt simplification algorithm (unchanged from V1)
- [ ] **EXP-03**: Two-sided settle-up flow with claim/confirm/dispute (unchanged from V1)
- [ ] **EXP-04**: Receipt scanning via Azure Document Intelligence (premium, unchanged from V1)
- [ ] **EXP-05**: Expense categories (unchanged from V1, premium)
- [ ] **EXP-06**: Recurring expense templates (unchanged from V1, premium)
- [ ] **EXP-07**: Expense export CSV/PDF (unchanged from V1, premium)
- [ ] **EXP-08**: Net balance (what you owe, what you're owed) shown in Today tab / Money tab header

### Notes

- [ ] **NOTE-01**: Create/edit/delete notes (unchanged from V1)
- [ ] **NOTE-02**: Rich text notes via Tiptap (premium, unchanged from V1)
- [ ] **NOTE-03**: Masonry grid layout (unchanged from V1)

### Reminders

- [ ] **REM-01**: CRUD for reminders with frequency and notify type (unchanged from V1)
- [ ] **REM-02**: Recurring reminders with cron-based firing (unchanged from V1)
- [ ] **REM-03**: Due reminders shown in Today tab
- [ ] **REM-04**: Push notification fired for due reminders on iOS/Android (previously web-only banners)
- [ ] **REM-05**: Push notification receipt-checking cron job (missing from V1, required for production reliability)

### Stats

- [ ] **STAT-01**: Household stats page with date range and charts (premium, unchanged from V1)
- [ ] **STAT-02**: Stats accessible from More tab on all platforms

### Settings

- [ ] **SET-01**: Profile (name, email, timezone, password, avatar) (unchanged from V1)
- [ ] **SET-02**: Appearance (theme: default/midnight) (unchanged from V1)
- [ ] **SET-03**: Household settings (name, invite code, members, danger zone) (unchanged from V1)
- [ ] **SET-04**: Billing / subscription management (accessible from More or Settings)
- [ ] **SET-05**: Promotions / promo code redemption (unchanged from V1)

### Revenue — Ads

- [ ] **AD-01**: Google AdMob banner ad integrated in free tier on iOS/Android
- [ ] **AD-02**: Ad banner placed in a single, consistent zone (bottom of screen or below content, never inline with actions)
- [ ] **AD-03**: Ad banner absent during: onboarding, checkout/billing flows, expense settling, active sheet interactions
- [ ] **AD-04**: New accounts receive 3-day ad-free grace period before ads appear
- [ ] **AD-05**: App Tracking Transparency (ATT) prompt shown before ads load on iOS
- [ ] **AD-06**: Non-personalized ads served for child accounts (COPPA compliance)
- [ ] **AD-07**: Premium subscription immediately and permanently removes all ads
- [ ] **AD-08**: Web does not show ads (mobile-only ad implementation)

### Revenue — Subscription

- [ ] **SUB-01**: Stripe web billing preserved (checkout, webhooks, cancel/reactivate, portal) (unchanged from V1)
- [ ] **SUB-02**: RevenueCat `react-native-purchases` v8.x integrated for iOS/Android IAP
- [ ] **SUB-03**: RevenueCat `appUserId` set to `householdId` (per-household pricing)
- [ ] **SUB-04**: RevenueCat webhook handler writes to `households.subscription_status` (same column Stripe uses)
- [ ] **SUB-05**: Stripe webhook posts subscription ID to RevenueCat REST API for cross-platform sync
- [ ] **SUB-06**: Premium state verified via `households.subscription_status` on all platforms (server-side gate)
- [ ] **SUB-07**: Monthly pricing: $4.99/household/month
- [ ] **SUB-08**: Annual pricing option: $39.99/household/year (~33% discount, promoted as "$3.33/month")
- [ ] **SUB-09**: 7-day free trial available on first premium subscription (RevenueCat + App Store/Play Store managed)
- [ ] **SUB-10**: No Stripe references, links, or pricing in the iOS/Android build (Apple Guideline 3.1.1 compliance)

### Platform — iOS (Expo)

- [ ] **IOS-01**: Expo SDK 53 project initialized in `apps/mobile/`
- [ ] **IOS-02**: Expo Router v4 file-based navigation configured
- [ ] **IOS-03**: NativeWind v4 configured for Tailwind styling in Expo
- [ ] **IOS-04**: All authenticated screens built: Today, Household (Chores, Calendar, Tasks), Food (Grocery, Meals), Money (Expenses), More (Notes, Reminders, Stats, Settings)
- [ ] **IOS-05**: All feature sheets rebuilt using `@gorhom/bottom-sheet` v5 with `BottomSheetTextInput`
- [ ] **IOS-06**: Expo Push Notifications wired to all reminder and chore alert events
- [ ] **IOS-07**: Universal Links configured for invite URLs (`/invite/[token]`), falling back to web
- [ ] **IOS-08**: TanStack Query configured with AppState `focusManager` and expo-network `onlineManager`
- [ ] **IOS-09**: Grocery list readable offline via TanStack Query cache (`networkMode: 'offlineFirst'`)
- [ ] **IOS-10**: All touch targets 48px minimum; list rows 64px
- [ ] **IOS-11**: Tested on physical iPhone (not Simulator only) before submission
- [ ] **IOS-12**: TestFlight build available by week 4 of iOS development
- [ ] **IOS-13**: App Store listing prepared: name, description, screenshots, demo credentials (including household code + child PIN)
- [ ] **IOS-14**: All `NSUsageDescription` strings present (camera for receipt scan, notifications, location for weather)
- [ ] **IOS-15**: App Store category: Productivity (not Kids — adult-first positioning to avoid COPPA Kids Category rules)

### Platform — Android (Expo)

- [ ] **AND-01**: Android variant of Expo project configured (same codebase as iOS)
- [ ] **AND-02**: Google Play Store listing prepared
- [ ] **AND-03**: Revenue Cat Google Play Billing configured
- [ ] **AND-04**: Push notifications tested on Android physical device
- [ ] **AND-05**: App submitted to Google Play Store (ships 4-6 weeks after iOS)

### Migration + Cutover

- [ ] **MIG-01**: V2 development never touches production `DATABASE_URL` — Neon branch used throughout
- [ ] **MIG-02**: All V2 schema changes are additive (no column drops, no renames on live tables) until cutover
- [ ] **MIG-03**: Cutover plan documented: feature flag or env var to switch traffic from V1 to V2
- [ ] **MIG-04**: Rollback plan tested: reverting to V1 without data loss
- [ ] **MIG-05**: All existing user IDs, household IDs, member associations, and subscription status preserved
- [ ] **MIG-06**: Existing sessions remain valid post-cutover (no forced re-authentication)

### Marketing Homepage

- [ ] **MKT-01**: Marketing homepage (`/`) redesigned to match V2 product and positioning
- [ ] **MKT-02**: Homepage references the Splitwise pricing change opportunity in copy
- [ ] **MKT-03**: App Store and Google Play download links on homepage (post-launch)
- [ ] **MKT-04**: OG image updated for V2 brand

---

## v2 Requirements (Post-Launch)

### Ambient Tablet Mode
- **TAB-01**: Fully customizable widget dashboard for tablet/large screen
- **TAB-02**: Available widgets: weather, clock, chores, calendar, activity feed
- **TAB-03**: Screensaver activates on idle

### Advanced Mobile Features
- **MOB-01**: Android ambient tablet mode
- **MOB-02**: Share sheet integration (add grocery items from other apps)
- **MOB-03**: Siri Shortcuts / widget integration for iOS

### Localization
- **I18N-01**: Spanish localization (all UI copy through next-intl translation keys)

### AI Features (future consideration)
- **AI-01**: Smart grocery suggestions based on meal plan
- **AI-02**: Chore schedule optimization based on completion history
- **AI-03**: Expense categorization via ML

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaboration (WebSockets) | 10s polling sufficient; complexity not justified for V2 |
| In-app payments (Venmo/banking integration) | Settle-up is informational; external payments |
| AI/LLM features | Not in V2 scope; revisit post-launch |
| Public community/social features | Private household app; no public profiles |
| Custom domain for households | Enterprise feature; not consumer |
| Web push notifications | Expo push for native; in-app banners for web |
| Video/audio attachments | Storage costs; not core |
| Multi-language at launch | English only; Spanish in V3 |
| Custom ad partnerships | Use AdMob programmatic; direct partnerships post-scale |
| RevenueCat Web Billing | Stripe is already built and superior for web |

---

## Traceability

*To be populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 through FOUN-07 | Phase 0 | Pending |
| IA-01 through IA-07 | Phase 1 | Pending |
| ONBR-01 through ONBR-06 | Phase 1 | Pending |
| DS-01 through DS-05 | Phase 1 | Pending |
| AUTH-01 through AUTH-06 | Phase 0-1 | Pending |
| HSLD-01 through HSLD-06 | Phase 2 | Pending |
| CHORE-01 through CHORE-06 | Phase 2 | Pending |
| RWD-01 through RWD-04 | Phase 2 | Pending |
| GROC-01 through GROC-06 | Phase 2 | Pending |
| MEAL-01 through MEAL-06 | Phase 2 | Pending |
| CAL-01 through CAL-05 | Phase 2 | Pending |
| TASK-01 through TASK-04 | Phase 2 | Pending |
| EXP-01 through EXP-08 | Phase 2 | Pending |
| NOTE-01 through NOTE-03 | Phase 2 | Pending |
| REM-01 through REM-05 | Phase 2 | Pending |
| STAT-01 through STAT-02 | Phase 2 | Pending |
| SET-01 through SET-05 | Phase 2 | Pending |
| AD-01 through AD-08 | Phase 3 | Pending |
| SUB-01 through SUB-10 | Phase 3 | Pending |
| IOS-01 through IOS-15 | Phase 4 | Pending |
| AND-01 through AND-05 | Phase 5 | Pending |
| MIG-01 through MIG-06 | Cross-phase | Pending |
| MKT-01 through MKT-04 | Phase 4-5 | Pending |

**Coverage:**
- v1 requirements: 112 total
- Categories: Foundation (7), IA (7), Onboarding (6), Design System (5), Auth (6), Household (6), Chores (6), Rewards (4), Grocery (6), Meals (6), Calendar (5), Tasks (4), Expenses (8), Notes (3), Reminders (5), Stats (2), Settings (5), Ads (8), Subscriptions (10), iOS (15), Android (5), Migration (6), Marketing (4)
- Mapped to phases: TBD (roadmapper assigns)
- Unmapped: 0 ⚠ (pending roadmap)

---
*Requirements defined: 2026-05-01*
*Last updated: 2026-05-01 after initial V2 definition*
