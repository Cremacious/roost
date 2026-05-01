# Roadmap: Roost V2

**Phases:** 5 | **Requirements:** 139 (across 23 categories) | **Timeline:** 12-14 weeks

---

## Phase Summary

| # | Phase | Goal | Est. Duration |
|---|-------|------|---------------|
| 0 | Foundation | Establish the infrastructure everything else depends on: monorepo, Neon branch, Drizzle migrations, Expo project, better-auth Expo plugin | 2 weeks |
| 1 | Product Redesign | Rebuild the core product identity on web: 5-tab IA, redesigned onboarding, V2 design system, Today dashboard | 4 weeks |
| 2 | Feature Parity — Web | Port all V1 features to V2 design language on web, including ad banner zone and Today tab integration points | 4 weeks |
| 3 | iOS + Revenue Layer | Build all authenticated screens in Expo, wire RevenueCat IAP, integrate AdMob, connect push notifications | 4-6 weeks |
| 4 | Cutover + Android | Execute V1-to-V2 cutover, launch Android, ship redesigned marketing homepage | 2-4 weeks |

---

## Phase Details

### Phase 0: Foundation
**Goal:** The codebase, database, and build infrastructure are restructured so that all V2 development proceeds in isolation from production V1 — monorepo established, Expo project initialized, Drizzle migrations switched, Neon branch created, and better-auth Expo plugin verified against the production URL.
**Depends on:** Nothing (first phase)
**Requirements:** FOUN-01, FOUN-02, FOUN-03, FOUN-04, FOUN-05, FOUN-06, FOUN-07, AUTH-04, AUTH-05, MIG-01, MIG-02, MIG-04, MIG-05, MIG-06

**Success Criteria** (what must be TRUE):
1. A developer can run the web app from `apps/web/` and the mobile app skeleton from `apps/mobile/` using npm workspace commands from the repo root
2. All schema changes are tracked as migration files (not db:push) and applied against a Neon development branch — the production database URL is never referenced in V2 code
3. An EAS development build installs on a physical iOS device and the Expo auth client successfully creates and persists a session against the production Vercel URL
4. Existing user IDs, household IDs, member associations, and subscription statuses are confirmed preserved and readable from the V2 development branch
5. `getUserHousehold` lives in `src/lib/auth/helpers.ts` and shared packages (`api-types`, `constants`, `utils`) are importable from both `apps/web` and `apps/mobile`

**Plans:** TBD

---

### Phase 1: Product Redesign
**Goal:** The web app presents the V2 product: a 5-tab navigation shell, redesigned onboarding that gets a new user into their household in under 60 seconds, a V2 design system applied across all shell surfaces, and a Today dashboard that replaces the V1 tile grid.
**Depends on:** Phase 0
**Requirements:** IA-01, IA-02, IA-03, IA-04, IA-05, IA-06, IA-07, ONBR-01, ONBR-02, ONBR-03, ONBR-04, ONBR-05, ONBR-06, DS-01, DS-02, DS-03, DS-04, DS-05, AUTH-01, AUTH-02, AUTH-03, AUTH-06

**Success Criteria** (what must be TRUE):
1. A new user creates a household and completes onboarding (including seeing their first meaningful screen) in under 60 seconds on web
2. The web app has exactly 5 top-level navigation destinations (Today / Household / Food / Money / More) and all V1 feature pages are accessible within one level of those destinations
3. The Today tab shows a useful at-a-glance view (chores due, upcoming events, grocery preview, active reminders) populated with real data from the database
4. The ad banner zone component exists and renders in the correct position — it is absent on the onboarding screens and billing flow, present elsewhere in the shell for free-tier users
5. Push notification permission is not requested during onboarding — the prompt is deferred to the appropriate in-feature trigger point

**Plans:** TBD
**UI hint**: yes

---

### Phase 2: Feature Parity — Web
**Goal:** Every V1 feature is accessible, functional, and visually coherent in V2 on web — household management, chores, rewards, grocery, meals, calendar, tasks, expenses, notes, reminders, stats, and settings — all integrated with the Today tab and the V2 design language.
**Depends on:** Phase 1
**Requirements:** HSLD-01, HSLD-02, HSLD-03, HSLD-04, HSLD-05, HSLD-06, CHORE-01, CHORE-02, CHORE-03, CHORE-04, CHORE-05, CHORE-06, RWD-01, RWD-02, RWD-03, RWD-04, GROC-01, GROC-02, GROC-03, GROC-04, GROC-05, GROC-06, MEAL-01, MEAL-02, MEAL-03, MEAL-04, MEAL-05, MEAL-06, CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, TASK-01, TASK-02, TASK-03, TASK-04, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, EXP-06, EXP-07, EXP-08, NOTE-01, NOTE-02, NOTE-03, REM-01, REM-02, REM-03, REM-04, REM-05, STAT-01, STAT-02, SET-01, SET-02, SET-03, SET-04, SET-05

**Success Criteria** (what must be TRUE):
1. A household can perform every core coordination action on web: add and complete chores, manage grocery items, create and view calendar events, split and settle expenses, plan meals, set reminders, and manage tasks
2. The Today tab surfaces real live data from all features: chores due today, overdue tasks, active reminders, upcoming events (next 48h), grocery preview, tonight's meal, and net expense balance
3. Grocery list is readable without a network connection (TanStack Query offline cache) and syncs automatically when connection is restored
4. Push notification receipt-checking cron is deployed and operational in production (not just coded), so reminder notifications are reliable
5. All premium features are correctly gated server-side and all free-tier limits are enforced — a free household cannot exceed limits by manipulating the client

**Plans:** TBD
**UI hint**: yes

---

### Phase 3: iOS + Revenue Layer
**Goal:** The Expo iOS app delivers full feature parity with the V2 web app, RevenueCat IAP is wired so iOS users can subscribe, AdMob banner ads run in the free tier with correct COPPA and ATT handling, and push notifications fire reliably for reminders and chore alerts.
**Depends on:** Phase 0 (Expo project), Phase 2 (all API routes finalized)
**Requirements:** IOS-01, IOS-02, IOS-03, IOS-04, IOS-05, IOS-06, IOS-07, IOS-08, IOS-09, IOS-10, IOS-11, IOS-12, IOS-13, IOS-14, IOS-15, AD-01, AD-02, AD-03, AD-04, AD-05, AD-06, AD-07, AD-08, SUB-01, SUB-02, SUB-03, SUB-04, SUB-05, SUB-06, SUB-07, SUB-08, SUB-09, SUB-10

**Success Criteria** (what must be TRUE):
1. A TestFlight build is available and an end-to-end session works on a physical iPhone: sign up, create household, add a chore, mark it done, add a grocery item, check it off
2. A free-tier iOS user sees a tasteful AdMob banner in the designated zone, the App Tracking Transparency prompt fires before ads load, and child accounts receive non-personalized ads
3. An iOS user can subscribe to premium ($4.99/month or $39.99/year) through the App Store, and the subscription status is immediately reflected in the web app (RevenueCat webhook writes to `households.subscription_status`)
4. A web subscriber's premium status is reflected in the iOS app without requiring a separate iOS subscription (Stripe webhook syncs to RevenueCat)
5. The iOS app bundle contains zero references to Stripe, web checkout URLs, or web pricing (Apple Guideline 3.1.1 compliant)
6. Push notifications fire for due reminders on physical iOS device; receipt-checking cron confirms delivery

**Plans:** TBD
**UI hint**: yes

---

### Phase 4: Cutover + Android
**Goal:** V2 replaces V1 in production without data loss, the Android app is submitted to Google Play, and the marketing homepage is redesigned to reflect the V2 product and position Roost against the Splitwise opportunity.
**Depends on:** Phase 3
**Requirements:** AND-01, AND-02, AND-03, AND-04, AND-05, MIG-03, MKT-01, MKT-02, MKT-03, MKT-04

**Success Criteria** (what must be TRUE):
1. V2 is live in production and serving all existing users — no user was forced to re-authenticate and all household data (chores, expenses, grocery, calendar) is intact
2. A documented rollback procedure has been tested: reverting to V1 without data loss takes under 30 minutes
3. An Android app is submitted to Google Play Store with Google Play Billing configured via RevenueCat and push notifications tested on a physical Android device
4. The marketing homepage references the Splitwise pricing change, includes App Store and Google Play download links, and matches V2 product positioning

**Plans:** TBD

---

## Requirement Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | Phase 0 | Pending |
| FOUN-02 | Phase 0 | Pending |
| FOUN-03 | Phase 0 | Pending |
| FOUN-04 | Phase 0 | Pending |
| FOUN-05 | Phase 0 | Pending |
| FOUN-06 | Phase 0 | Pending |
| FOUN-07 | Phase 0 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 0 | Pending |
| AUTH-05 | Phase 0 | Pending |
| AUTH-06 | Phase 1 | Pending |
| IA-01 | Phase 1 | Pending |
| IA-02 | Phase 1 | Pending |
| IA-03 | Phase 1 | Pending |
| IA-04 | Phase 1 | Pending |
| IA-05 | Phase 1 | Pending |
| IA-06 | Phase 1 | Pending |
| IA-07 | Phase 1 | Pending |
| ONBR-01 | Phase 1 | Pending |
| ONBR-02 | Phase 1 | Pending |
| ONBR-03 | Phase 1 | Pending |
| ONBR-04 | Phase 1 | Pending |
| ONBR-05 | Phase 1 | Pending |
| ONBR-06 | Phase 1 | Pending |
| DS-01 | Phase 1 | Pending |
| DS-02 | Phase 1 | Pending |
| DS-03 | Phase 1 | Pending |
| DS-04 | Phase 1 | Pending |
| DS-05 | Phase 1 | Pending |
| HSLD-01 | Phase 2 | Pending |
| HSLD-02 | Phase 2 | Pending |
| HSLD-03 | Phase 2 | Pending |
| HSLD-04 | Phase 2 | Pending |
| HSLD-05 | Phase 2 | Pending |
| HSLD-06 | Phase 2 | Pending |
| CHORE-01 | Phase 2 | Pending |
| CHORE-02 | Phase 2 | Pending |
| CHORE-03 | Phase 2 | Pending |
| CHORE-04 | Phase 2 | Pending |
| CHORE-05 | Phase 2 | Pending |
| CHORE-06 | Phase 2 | Pending |
| RWD-01 | Phase 2 | Pending |
| RWD-02 | Phase 2 | Pending |
| RWD-03 | Phase 2 | Pending |
| RWD-04 | Phase 2 | Pending |
| GROC-01 | Phase 2 | Pending |
| GROC-02 | Phase 2 | Pending |
| GROC-03 | Phase 2 | Pending |
| GROC-04 | Phase 2 | Pending |
| GROC-05 | Phase 2 | Pending |
| GROC-06 | Phase 2 | Pending |
| MEAL-01 | Phase 2 | Pending |
| MEAL-02 | Phase 2 | Pending |
| MEAL-03 | Phase 2 | Pending |
| MEAL-04 | Phase 2 | Pending |
| MEAL-05 | Phase 2 | Pending |
| MEAL-06 | Phase 2 | Pending |
| CAL-01 | Phase 2 | Pending |
| CAL-02 | Phase 2 | Pending |
| CAL-03 | Phase 2 | Pending |
| CAL-04 | Phase 2 | Pending |
| CAL-05 | Phase 2 | Pending |
| TASK-01 | Phase 2 | Pending |
| TASK-02 | Phase 2 | Pending |
| TASK-03 | Phase 2 | Pending |
| TASK-04 | Phase 2 | Pending |
| EXP-01 | Phase 2 | Pending |
| EXP-02 | Phase 2 | Pending |
| EXP-03 | Phase 2 | Pending |
| EXP-04 | Phase 2 | Pending |
| EXP-05 | Phase 2 | Pending |
| EXP-06 | Phase 2 | Pending |
| EXP-07 | Phase 2 | Pending |
| EXP-08 | Phase 2 | Pending |
| NOTE-01 | Phase 2 | Pending |
| NOTE-02 | Phase 2 | Pending |
| NOTE-03 | Phase 2 | Pending |
| REM-01 | Phase 2 | Pending |
| REM-02 | Phase 2 | Pending |
| REM-03 | Phase 2 | Pending |
| REM-04 | Phase 2 | Pending |
| REM-05 | Phase 2 | Pending |
| STAT-01 | Phase 2 | Pending |
| STAT-02 | Phase 2 | Pending |
| SET-01 | Phase 2 | Pending |
| SET-02 | Phase 2 | Pending |
| SET-03 | Phase 2 | Pending |
| SET-04 | Phase 2 | Pending |
| SET-05 | Phase 2 | Pending |
| AD-01 | Phase 3 | Pending |
| AD-02 | Phase 3 | Pending |
| AD-03 | Phase 3 | Pending |
| AD-04 | Phase 3 | Pending |
| AD-05 | Phase 3 | Pending |
| AD-06 | Phase 3 | Pending |
| AD-07 | Phase 3 | Pending |
| AD-08 | Phase 3 | Pending |
| SUB-01 | Phase 3 | Pending |
| SUB-02 | Phase 3 | Pending |
| SUB-03 | Phase 3 | Pending |
| SUB-04 | Phase 3 | Pending |
| SUB-05 | Phase 3 | Pending |
| SUB-06 | Phase 3 | Pending |
| SUB-07 | Phase 3 | Pending |
| SUB-08 | Phase 3 | Pending |
| SUB-09 | Phase 3 | Pending |
| SUB-10 | Phase 3 | Pending |
| IOS-01 | Phase 3 | Pending |
| IOS-02 | Phase 3 | Pending |
| IOS-03 | Phase 3 | Pending |
| IOS-04 | Phase 3 | Pending |
| IOS-05 | Phase 3 | Pending |
| IOS-06 | Phase 3 | Pending |
| IOS-07 | Phase 3 | Pending |
| IOS-08 | Phase 3 | Pending |
| IOS-09 | Phase 3 | Pending |
| IOS-10 | Phase 3 | Pending |
| IOS-11 | Phase 3 | Pending |
| IOS-12 | Phase 3 | Pending |
| IOS-13 | Phase 3 | Pending |
| IOS-14 | Phase 3 | Pending |
| IOS-15 | Phase 3 | Pending |
| AND-01 | Phase 4 | Pending |
| AND-02 | Phase 4 | Pending |
| AND-03 | Phase 4 | Pending |
| AND-04 | Phase 4 | Pending |
| AND-05 | Phase 4 | Pending |
| MIG-01 | Phase 0 | Pending |
| MIG-02 | Phase 0 | Pending |
| MIG-03 | Phase 4 | Pending |
| MIG-04 | Phase 0 | Pending |
| MIG-05 | Phase 0 | Pending |
| MIG-06 | Phase 0 | Pending |
| MKT-01 | Phase 4 | Pending |
| MKT-02 | Phase 4 | Pending |
| MKT-03 | Phase 4 | Pending |
| MKT-04 | Phase 4 | Pending |

---

## Coverage Check

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 0 | FOUN-01..07, AUTH-04..05, MIG-01..02, MIG-04..06 | 14 |
| Phase 1 | IA-01..07, ONBR-01..06, DS-01..05, AUTH-01..03, AUTH-06 | 23 |
| Phase 2 | HSLD-01..06, CHORE-01..06, RWD-01..04, GROC-01..06, MEAL-01..06, CAL-01..05, TASK-01..04, EXP-01..08, NOTE-01..03, REM-01..05, STAT-01..02, SET-01..05 | 60 |
| Phase 3 | IOS-01..15, AD-01..08, SUB-01..10 | 33 |
| Phase 4 | AND-01..05, MIG-03, MKT-01..04 | 10 |
| **Total** | | **140** |

Note: The requirements document header states 112 but the enumerated requirements across 23 categories total 139-140 (category counts sum to 139, with one AUTH requirement shared between Phase 0 and Phase 1 boundary). All enumerated requirements have been assigned to exactly one phase.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Foundation | 0/TBD | Not started | - |
| 1. Product Redesign | 0/TBD | Not started | - |
| 2. Feature Parity Web | 0/TBD | Not started | - |
| 3. iOS + Revenue | 0/TBD | Not started | - |
| 4. Cutover + Android | 0/TBD | Not started | - |
