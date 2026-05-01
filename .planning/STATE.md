# Project State: Roost V2

**Status:** Phase 0 Planned — Ready to Execute
**Current Phase:** Phase 0 (Foundation)
**Last Updated:** 2026-05-01

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-01)

**Core value:** One household. One app. Everything works, everything connects, and nobody needs to be told how to use it.
**Current focus:** Phase 0 — Foundation

**Elevator pitch:** The household OS for families and roommates. Competes with Splitwise + Cozi + OurHome combined. V2 ships simultaneously on web and iOS, with tasteful ads in the free tier and a $4.99/month premium that removes ads and unlocks advanced features.

---

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 0 | Foundation | Ready to Execute (5 plans) |
| 1 | Product Redesign | Not Started |
| 2 | Feature Parity Web | Not Started |
| 3 | iOS + Revenue | Not Started |
| 4 | Cutover + Android | Not Started |

---

## Current Position

**Phase:** 0 — Foundation
**Plan:** None (ready to begin Wave 1)
**Status:** Planned — 5 plans across 4 waves

```
[ Phase 0 ] [ Phase 1 ] [ Phase 2 ] [ Phase 3 ] [ Phase 4 ]
  PLANNED       ---          ---          ---          ---
```

---

## Performance Metrics

*To be populated after Phase 0 begins.*

- Plans executed: 0
- Requirements completed: 0 / 139
- Phases completed: 0 / 5

---

## Decisions Log

| Decision | Rationale | Status |
|----------|-----------|--------|
| Keep all V1 features | Nothing is wrong with the features — the UX and IA are what need fixing | Confirmed |
| Rebuild branch (`rebuild/v2`), not a new repo | Preserves git history, existing deploy config, avoids data migration complexity | Confirmed |
| Free + ads model | Removes paywall friction for household adoption; premium removes ads and unlocks advanced features | Confirmed |
| Price: $4.99/month per household | Slightly above V1 ($4), below $5 psychological threshold, comparable to Splitwise Pro; aligns with RevenueCat App Store pricing | Confirmed |
| Annual option: $39.99/year | Approximately 33% discount; improves retention; standard App Store pattern | Confirmed |
| Web + iOS simultaneous launch | iOS is the primary mobile target; web must ship together for link-based acquisition | Confirmed |
| Android 4-6 weeks after iOS | Same Expo codebase; configuration delta only; staggered to de-risk launch | Confirmed |
| Expo SDK 53 (not 54) | SDK 54 has third-party library compatibility lag at time of decision | Confirmed |
| Expo for mobile | Business logic already DOM-free; same API; proven pattern for this stack | Confirmed |
| 5-tab max navigation | Forces IA discipline; current 9+ item nav is the root cause of "too scattered" feel | Confirmed |
| Meals grouped with Grocery in Food tab | Both relate to food; ingredients flow directly to grocery list; logical grouping | Confirmed |
| RevenueCat `appUserId` = `householdId` | Per-household pricing; all members share one subscription | Confirmed |
| `households.subscription_status` as single source of truth | Both Stripe and RevenueCat webhooks write to this column; never trust client | Confirmed |
| Universal Links (not custom scheme) for invite URLs | Falls back to web browser when app not installed; better UX | Confirmed |
| `@gorhom/bottom-sheet` v5 for Expo sheets | Web `DraggableSheet` does not port to Expo; this is the correct native primitive | Confirmed |
| Neon database branch for V2 development | `db:push` can silently drop columns V1 code still uses; isolation is required | Confirmed |
| Switch from `db:push` to `drizzle-kit generate + migrate` | Production safety; auditable migration history; required before any V2 schema changes | Confirmed |
| No Stripe references in iOS/Android build | Apple Guideline 3.1.1 compliance; Stripe checkout and pricing belong on web only | Confirmed |
| No web ads (mobile-only AdMob) | Web monetization via Stripe; ads are a mobile acquisition lever only | Confirmed |
| Push permission deferred past onboarding | Research: deferred permission requests get 2-3x acceptance rate vs. onboarding prompts | Confirmed |

---

## Open Questions

| Question | Impact | Priority |
|----------|--------|----------|
| App Store name conflict — search "Roost" before external marketing commitment; fallback name: "Roost: Household OS" | Blocks App Store submission | High |
| better-auth Expo cookie behavior — open GitHub issues suggest problems under some server configs; must test against production Vercel URL in Phase 0 | Blocks Phase 0 sign-off | High |
| Free trial vs. no trial — trials convert at 2-3x median rate; decision needed before billing UI is built in Phase 3 | Impacts revenue architecture | High |
| COPPA positioning — if Apple treats child PIN login as a kids-targeted app, Kids Category rules apply (no AdMob); prevention: adult-first App Store positioning | Impacts ad revenue | High |
| Ad grace period duration — research recommends 3-7 days ad-free for new signups; exact duration needed before ad implementation in Phase 3 | Impacts Phase 3 implementation | Medium |
| 7-day free trial: confirmed or dropped? (SUB-09 is in scope but requires explicit confirmation before RevenueCat trial config is built) | Impacts Phase 3 implementation | Medium |

---

## Accumulated Context

### Architecture Notes

- All business logic lives in `src/lib/` with zero DOM dependencies — already Expo-compatible. Web UI stays in `apps/web/`. Expo UI in `apps/mobile/`. Both call the same API routes on Vercel.
- Schema entry point: `src/db/schema/index.ts` re-exports all tables. This path will move to `apps/web/src/db/schema/index.ts` after monorepo restructure.
- `getUserHousehold` currently in `src/app/api/chores/route.ts` — must move to `src/lib/auth/helpers.ts` in Phase 0 (FOUN-07) before any Phase 1 work.
- The Neon database branch is non-negotiable. Running V2 migrations against the production URL is the highest-risk action available to a solo developer on this stack.

### Key Technical Risks

- RevenueCat + Stripe entitlement desync: subscribe on web, iOS app still shows ads. The Stripe webhook must call RevenueCat REST API to sync. Test the full round-trip before launch.
- `db:push` was the V1 migration strategy. It can silently drop columns. Migration files must exist before the first V2 schema change.
- Simultaneous web + iOS launch: every feature is designed and built twice. Start Expo skeleton in Phase 0 so EAS builds exist by week 4 of Phase 1.
- Apple Guideline 3.1.1: any Stripe reference in the iOS app bundle risks rejection. Audit every settings and billing screen before Phase 3 submission.

### V1 Features Preserved Intact (no redesign needed, porting only)

Chores, grocery, calendar, tasks, expenses (including receipt scanning, recurring, export, settle-up), notes, reminders, rewards, stats, settings, billing, promo codes, activity feed, household management, guest invites, child accounts, leaderboard, chore history, custom categories, admin panel.

### V2 Net-New Work

- 5-tab IA and nav restructure
- Redesigned onboarding (household-first, under 60 seconds)
- Today tab (aggregates data across all features)
- V2 design language (restrained color use, content-first)
- Ad banner zone component (AdMob on mobile, absent on web)
- Expo iOS app (all screens)
- RevenueCat IAP (iOS/Android)
- Android configuration and Play Store submission
- Marketing homepage redesign
- Push notification receipt-checking cron (missing from V1)
- Grocery offline read (TanStack Query `networkMode: 'offlineFirst'`)
- Annual subscription option ($39.99/year)
- Deep linking via Universal Links for invite URLs
- App Tracking Transparency prompt (iOS)
- COPPA non-personalized ad flag for child accounts

---

## Session Continuity

**To resume work:** Read this file and `.planning/ROADMAP.md` to restore context. Check current phase status above, then run `/gsd-plan-phase [N]` for the current phase.

**Files that define the project:**
- `.planning/PROJECT.md` — core value, constraints, migration strategy, decisions
- `.planning/REQUIREMENTS.md` — all 139 v1 requirements with IDs
- `.planning/ROADMAP.md` — phase structure and success criteria
- `.planning/STATE.md` — this file
- `CLAUDE.md` — implementation rules, design system, V1 codebase inventory
