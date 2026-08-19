# Roost Mobile — Sub-Project 1: Foundation + Core Daily Loop

Status: Approved for planning
Date: 2026-08-18

## Context

Roost has been a web app (Next.js) so far. The goal now is a native iOS app,
built with Expo, that becomes the actual daily driver for the household
(Chris + wife), eventually replacing the web app entirely and heading toward
an App Store launch.

This is sub-project 1 of a larger decomposition (see "Future sub-projects"
below). It is scoped to produce a real, installable TestFlight build covering
auth and the core daily-use modules — enough for two people to genuinely use
the app day to day, before any visual redesign or the remaining feature
modules land.

### Why a new repo, not a monorepo

`roost-mobile` is a separate repo from `roost`, not a workspace inside it.
The `roost` repo previously had a `apps/mobile` + `packages/*` monorepo
scaffold from an earlier, abandoned "V2 monorepo" attempt (commit `1c50b6d`),
which was later superseded when `apps/web` was promoted to the repo root
(commit `412a19c`). That scaffold is dead: nothing in the current `src/` web
app imports from it, and it's pinned to stale Expo/RN versions. It is deleted
as part of this project (see "Roost repo changes" below) rather than reused.

### Why the same backend, same database

`roost-mobile` is a pure client. It talks to the existing Next.js API routes
on Vercel, which continue reading/writing the existing production Neon
database. No new backend is built. The web app's UI stops being maintained
going forward, but its Next.js deployment keeps running purely to serve
`/api/*` — the web pages stay in the repo, unmaintained, rather than being
actively stripped out in this project.

There is deliberately **no separate staging environment**. The mobile app
points at the same production Vercel deployment and production database the
web app already uses. Chris and his wife's real household data is what gets
used for testing. This is an intentional simplification, not an oversight —
revisit if multi-person testing beyond the household ever becomes a concern.

## Scope

### In scope

- New `roost-mobile` Expo Router (TypeScript) repo
- better-auth wired to the existing backend via its official Expo plugin
- Screens: Login, Signup, Child Login (3-step: code → picker → PIN pad),
  onboarding (create/join household)
- Tab navigator: Today, Chores, Grocery, Calendar, Tasks
- Trimmed More/Settings: account info, household info, sign out
- Chores premium gates ported now (recurring-frequency lock, leaderboard
  lock) even though billing isn't wired up yet in this sub-project, so later
  sub-projects don't retrofit them
- `usePermissionGate`-equivalent client-side permission gating, ported from
  web's convention
- EAS Build set up against Chris's existing Apple Developer account;
  `preview` profile produces a standalone build (JS bundle embedded, no
  Metro/dev-server dependency) installed via TestFlight
- One required backend change in the `roost` repo: better-auth `expo()`
  server plugin + trusted origin for the app's URL scheme
- Deletion of the dead `apps/mobile` / `packages/*` scaffold from `roost`

### Explicitly out of scope (deferred to later sub-projects)

- Notes, Reminders, Meals modules
- Money/Expenses (including receipt scanning)
- Rewards system
- Billing — RevenueCat/StoreKit integration for iOS (Stripe is **not** used
  on mobile; confirmed decision)
- Promo code redemption
- Guest invites, multi-household switching
- Push notifications (Expo Push token registration + delivery)
- Visual redesign (Claude Design handoff) — this sub-project ships with
  plain, functional RN styling only
- Admin panel — stays web-only permanently; it's an internal tool, not a
  user-facing feature, so it is never part of any mobile parity target

## Architecture

### Repo structure (`roost-mobile`)

```
roost-mobile/
  app/                      Expo Router file-based routes
    (auth)/
      login.tsx
      signup.tsx
      child-login.tsx
    (app)/
      _layout.tsx           Tab navigator: Today, Chores, Grocery, Calendar, Tasks, More
      today.tsx
      chores/
      grocery/
      calendar/
      tasks/
      more.tsx
    onboarding.tsx
    _layout.tsx              Root layout: auth/onboarding gate
  src/
    lib/
      auth/                 better-auth Expo client setup
      api/                  apiFetch() wrapper + typed API calls, ported per-module
      constants/            Colors, plan limits — ported from roost's src/lib/constants
      hooks/                Ported/adapted hooks (useHousehold-equivalent, usePermissionGate)
      utils/                Ported DOM-free utils (grocerySort, recurrence, debt simplification, etc.)
    components/              Screen-level and shared RN components
    types/
  app.json
  eas.json
  app.config.ts              EXPO_PUBLIC_API_URL and other public config
```

Shared logic is **copied and adapted**, not published as a cross-repo
package. `roost`'s existing "NO DOM dependencies" convention for
`src/lib/utils` and `src/lib/hooks` means most of this ports with minimal
changes — mainly swapping any `window`/`localStorage` usage (there is
little to none in the DOM-free files) and adjusting import paths.

### Auth & session flow

- **Server (`roost` repo)**: add the `expo()` plugin to the existing
  `betterAuth()` config in `src/lib/auth/index.ts`, and add the mobile app's
  URL scheme to trusted origins. No changes to `requireSession()`,
  `requireHouseholdMember()`, `requireHouseholdAdmin()`, `requirePremium()`,
  or the child-PIN login route — they keep working exactly as they do today.
- **Client (`roost-mobile`)**: `expoClient()` from better-auth's Expo
  integration, using `expo-secure-store` for session storage, pointed at the
  production Vercel base URL.
- **Child PIN login**: mobile calls the existing `GET`/`POST
  /api/auth/child-login` routes exactly as the web child-login page does.
  Success sets a session the same way; the Expo client plugin captures and
  persists it like any other sign-in.
- **Route protection**: no server-side redirect equivalent exists on mobile.
  The root layout (`app/_layout.tsx`) checks `useSession()` on launch and
  redirects to `(auth)` if unauthenticated, or to `/onboarding` if
  `onboarding_completed` is false — mirroring `src/proxy.ts`'s guard logic
  but implemented client-side.

### Data layer

- TanStack Query, following the same conventions documented in the web app:
  polling intervals per data type, and the optimistic-update pattern
  (`cancelQueries` → `setQueryData` → capture previous → revert `onError` →
  `invalidate` `onSettled`).
- A single `apiFetch(path, options)` wrapper in `src/lib/api/` that prefixes
  `EXPO_PUBLIC_API_URL`, uses the better-auth fetch client for credentials,
  and throws typed errors carrying `.code` (mirroring the existing
  `const err = new Error(msg) as Error & { code?: string }` pattern) so
  premium-gate and permission-gate handling on mobile can reuse the same
  error-routing convention as web.
- Zero changes to any `/api/*` route request/response shapes. Mobile is a
  second consumer of contracts that already exist.

### Build & distribution

- EAS Build, iOS only for this phase (Android is out of scope per Chris and
  his wife both being on iPhone).
- `eas.json` profiles:
  - `development` — dev-client build, for active coding sessions where live
    reload via Metro is wanted. Not what ends up on Chris's or his wife's
    phone for actual daily use.
  - `preview` — standalone build with the JS bundle embedded. No dev server
    involved at runtime. Distributed via TestFlight internal testing. This
    is the build used for real household use.
- EAS project linked to Chris's existing Apple Developer Program account.
  Bundle identifier choice (e.g. reusing `com.roost.app` from the deleted
  dead scaffold, since it was never registered with Apple, vs. a fresh
  identifier) is an implementation-time decision, not a design constraint.
- `EXPO_PUBLIC_API_URL` (public, points at the production Vercel deployment)
  is the only environment value the mobile app needs. No database,
  Stripe/RevenueCat, Azure, or Resend secrets are ever present client-side —
  those remain server-only in the `roost` Vercel deployment, unchanged.

## Roost repo changes

1. Delete `apps/mobile/` and `packages/{api-types,constants,utils}/`
   (dead scaffold from the abandoned V2 monorepo attempt).
2. Remove the `workspaces` field from the root `package.json`.
3. Add the `expo()` better-auth server plugin and a trusted-origin entry for
   the mobile app's URL scheme to `src/lib/auth/index.ts`.

These are the only changes to the `roost` repo required by this
sub-project. Everything else happens in the new `roost-mobile` repo.

## Verification plan

- `eas build --profile preview --platform ios` produces an installable
  build; install via TestFlight on Chris's phone first.
- Manual smoke-test checklist before treating a build as "ready to hand to
  wife": sign up, log in, log out, child PIN login, create household, join
  household by code, and a full CRUD pass (create/complete/edit/delete) on
  each of Chores, Grocery, Calendar, Tasks.
- Once the smoke test passes against Chris's own account, add his wife as a
  TestFlight internal tester and repeat the smoke test from her device
  against the shared household.
- No automated test suite is in scope for this sub-project (the web app's
  Playwright E2E suite is not ported to mobile here — revisit if/when the
  mobile app stabilizes).

## Future sub-projects (not designed yet)

1. **This one** — foundation + core daily loop
2. Notes, Reminders, Meals
3. Money/Expenses, including receipt scanning (free-tier parity first)
4. Billing on iOS — RevenueCat/StoreKit integration, replacing Stripe on
   mobile entirely (confirmed: Stripe is not used on mobile)
5. Visual redesign pass, applying the Claude Design handoff screen-by-screen
   on top of the functional UI built in earlier sub-projects
6. Push notifications + App Store submission polish

Each gets its own brainstorming pass, design doc, and implementation plan
when it's time to build it.
