# Research Summary: Roost V2

**Synthesized:** 2026-05-01
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, PROJECT.md
**Overall Confidence:** HIGH for web stack and IA decisions, MEDIUM-HIGH for Expo-specific details

---

## Recommended Stack

**Web (locked, no changes):** Next.js 16 App Router, Drizzle + Neon, better-auth, TanStack Query, Tailwind v4, shadcn/ui, Stripe.

**Mobile (new):** Expo SDK 53 (not 54 — SDK 54 has third-party library compatibility lag), Expo Router v4, NativeWind v4, `@better-auth/expo` for session management with `expo-secure-store`.

**Monorepo:** npm workspaces at repo root. `apps/web/` and `apps/mobile/` under `apps/`. Shared packages in `packages/api-types/`, `packages/constants/`, `packages/utils/`. Add Turborepo only if build caching becomes painful.

**Monetization:** Stripe (web, unchanged) + RevenueCat `react-native-purchases` v8.x (iOS/Android). `households.subscription_status` in Neon is the single source of truth — both Stripe and RevenueCat webhooks write to it. RevenueCat `appUserId` must be `householdId`, not `userId`.

**Ads:** Google AdMob via `react-native-google-mobile-ads` v15.x. Mobile only. Requires native EAS builds, App Tracking Transparency prompt on iOS, COPPA non-personalized ad flag for child accounts.

**Push:** Expo Push Service with `expo-notifications`. Add a receipt-checking cron job (missing from V1) for production reliability.

**Builds/CI:** EAS Build for all iOS/Android builds. EAS Update (OTA) for JS-only changes only.

---

## Table Stakes

Features that cause immediate uninstall if absent or broken:

1. **Shared grocery list with reliable check-off** — highest daily-use feature; must be fastest and most reliable
2. **Reliable shared calendar** — one sync bug breaks trust permanently
3. **Frictionless member invite join flow** — must show household before requiring account creation
4. **First meaningful action in under 60 seconds** — 72% abandon if onboarding takes too many steps
5. **Cross-platform availability** — web + iOS + Android is the baseline expectation
6. **Push notifications that actually fire** — if chore reminders don't work, the coordination promise is broken
7. **Offline read for grocery** — TanStack Query `networkMode: 'offlineFirst'` covers this cheaply

---

## Key Differentiators

Features that generate word-of-mouth and create lock-in competitors cannot match:

1. **Child accounts with rewards tied to chore completion** — no competitor does this in a modern, polished way; highest-retention segment
2. **Per-household pricing** — "one price covers everyone" is the clearest value prop in the market; uniquely family-friendly
3. **Receipt scanning with per-person line item splitting** — no household app offers this
4. **Meals to grocery integration in one tap** — creates automation that generates word-of-mouth
5. **Household activity feed** — no competitor has a persistent shared household context feed
6. **The Splitwise refugee opportunity** — Splitwise's 2024 pricing changes drove massive documented user exodus; market window is real and time-limited

---

## Critical Architectural Decisions

Decisions that must be made before writing mobile UI code:

**1. Monorepo structure (Week 1)**
Move `src/` to `apps/web/src/`. Create `apps/mobile/`. Extract shared types, constants, utilities to `packages/`. This blocks everything else.

**2. better-auth Expo plugin (Week 2)**
Add the `expo()` plugin to better-auth server config. Add `trustedOrigins` for Expo origins. Build Expo `authClient.ts` with `expoClient` + `expo-secure-store`. Test against production Vercel URL immediately — open GitHub issues about cookie handling in dev environments.

**3. RevenueCat entitlement architecture**
RevenueCat and Stripe do not auto-sync. Both webhook handlers must write to `households.subscription_status`. RevenueCat `appUserId` = `householdId`. Build the webhook bridge before any mobile IAP code.

**4. Schema migration strategy (immediately, before any V2 schema changes)**
Switch from `db:push` to `drizzle-kit generate` + `drizzle-kit migrate`. Create a Neon database branch for V2 development. Never run V2 code against the production `DATABASE_URL` during development. All V2 schema changes must be additive until cutover.

**5. EAS Build project (Week 2)**
Push notifications, AdMob, and RevenueCat all require native code that does not run in Expo Go. First EAS development build must exist before any of these can be tested.

**6. Deep linking**
Use Universal Links (HTTPS), not custom scheme (`roost://`), for invite URLs. Invite links must fall back to web browser when app not installed.

**7. Bottom sheet primitive**
Use `@gorhom/bottom-sheet` v5 for all Expo sheets. Use `BottomSheetTextInput` for all text inputs inside sheets. Web's `DraggableSheet` does not port to Expo.

---

## Top 5 Pitfalls to Avoid

**1. The Admin Island: Only the admin ever uses it.**
The join flow must show the household immediately and defer password creation until after value is demonstrated. If not solved, no other metric matters.

**2. `db:push` against a shared production database.**
`db:push` can silently drop columns V1 code still uses. Create a Neon database branch at V2 kickoff. Switch to migration files immediately.

**3. Apple Guideline 3.1.1: any Stripe reference in the iOS build.**
The Stripe publishable key and any mention of Stripe, checkout, or web pricing must be absent from the iOS app bundle. Audit every settings and billing screen before submission.

**4. RevenueCat + Stripe entitlement desync.**
Subscribe on web, iOS app still shows ads. The Stripe webhook must call RevenueCat REST API to sync. Test the full round-trip before launch.

**5. Treating simultaneous web + iOS launch as a guarantee.**
Every feature is designed and built twice. Plan for web first (week 8-10), iOS 4-6 weeks later. Start Expo skeleton in week 1. Have TestFlight builds running by week 4.

---

## Market Opportunity

The household app market is fragmented: single-purpose tools (Splitwise, Cozi, Tody) or shallow all-in-one apps (OurHome, FamilyWall) that lack depth. No app combines real expense tracking, chore management, child rewards, shared grocery, and calendar in a modern package. This gap is exactly where Roost sits.

**Most important market signal:** Splitwise's 2024 self-destruction (4-expense daily limit, unskippable video ads) drove a documented mass user exodus. Marketing should name this directly.

**Monetization benchmarks (RevenueCat 2025, 75k+ apps):**
- Freemium median Day-35 conversion: 2.18%
- Family plans increase retention 52% vs individual subscriptions — per-household pricing is structurally correct
- 82% of trial starts happen on Day 0 — first session determines whether users ever pay
- Realistic V2 targets: 2-4% of active households convert to premium in Year 1

**Price:** $4.99/month per household — below the $5 psychological threshold, comparable to Splitwise Pro, positioned as "less than one coffee for the entire household."

---

## Phase Implications

**Phase 0: Foundation (Weeks 1-2) — sequential blockers**
Monorepo restructuring, shared package extraction, better-auth Expo plugin, EAS Build setup, Neon database branch, switch to Drizzle migration files. Nothing else starts until auth works against production URL and directory structure is in place.

**Phase 1: Core Product Redesign (Weeks 2-6) — web first, mobile skeleton parallel**
Redesigned 5-tab IA, redesigned onboarding (household-first, under 60 seconds), redesigned Dashboard as "Today" view. Start Expo project with navigation-only skeleton so EAS builds exist by week 4.

**Phase 2: Feature Parity — Web (Weeks 4-8)**
Port all V1 features to V2 design system. Priority order: Grocery, Chores + rewards, Calendar, Dashboard, Expenses, Tasks, Reminders, Notes, Meals, Settings. Ad banner integration here — no ads during onboarding, 3-7 day grace period for new users.

**Phase 3: iOS Feature Parity (Weeks 6-12)**
MVP scope for iOS launch: Grocery, Chores, Calendar, Dashboard, Expenses (the 5 highest daily-use features). Test every sheet on a physical iPhone. Have TestFlight builds running throughout.

**Phase 4: Revenue Layer (Weeks 8-12, parallel with Phase 3)**
RevenueCat IAP, AdMob banners, push notification receipt-checking cron. Requires physical device testing.

**Phase 5: App Store Submission (Weeks 10-12)**
2-week buffer. Pre-submission: all `NSUsageDescription` strings, no Stripe references, demo credentials (including child PIN and household code), COPPA non-personalized ads for child accounts.

**Phase 6: Android + Post-Launch (4-6 weeks after iOS)**
Same Expo codebase plus Android config. Post-launch additions: ambient tablet mode, receipt scanning, expense export, custom chore categories, multiple grocery lists, Stats page.

**Hard constraints governing all phases:**
- 5-tab navigation is constitutional. No new feature gets a top-level tab.
- `households.subscription_status` is the single source of truth for premium, enforced server-side.
- Child finance block enforced at API level (403), never client-only.
- Schema changes additive until V1-to-V2 cutover.

---

## Open Questions

1. **App Store name conflict:** Search the App Store for "Roost" before any external marketing commitment. Fallback: "Roost: Household OS."
2. **better-auth Expo cookie behavior:** Open GitHub issues suggest cookie problems under some server configs. Must test against production Vercel URL in Phase 0.
3. **Free trial vs. no trial:** Trial users convert at 2-3x median rate. Decision needed before billing UI is built.
4. **COPPA positioning:** If Apple treats child PIN login as making Roost a kids-targeted app, Kids Category rules apply (no AdMob). Prevention: adult-first App Store positioning.
5. **Ad grace period duration:** Research recommends 3-7 days ad-free for new signups. Exact duration needed before ad implementation.
6. **Notification permission timing:** Research strongly recommends deferred requests (after first chore completion), not during onboarding.

---

*Research synthesized: 2026-05-01*
