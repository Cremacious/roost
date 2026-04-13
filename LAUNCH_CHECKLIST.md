# Roost Launch Checklist

Fix Playwright selector brittleness.
Fix the sign-out helper/dialog interaction.
Recheck premium test assumptions.
Rerun Playwright.
Fix the ESLint test-results glob issue.
Move to CI.
Continue the remaining launch checklist items.

Status key: `todo`, `in_progress`, `blocked`, `done`

## Handoff Status

This file is the current handoff point for continuing launch-readiness work on another machine.

### Done so far

- `npm run build` was verified successfully outside the sandbox.
- The original Windows file-lock suspicion was reduced: the production build is not currently blocked by a source-level compile error.
- The seeded E2E account mismatch was fixed in `src/db/seed.ts`.
- Seeded users with existing household memberships are now marked onboarded in both auth-visible and app-visible user tables.
- The Playwright `global-setup` failure where seeded admins were redirected to `/onboarding` instead of `/dashboard` is resolved.
- The Neon HTTP driver issue in `src/app/api/user/profile/route.ts` was fixed by removing unsupported `db.transaction(...)` usage.
- `npm run test -- --runInBand` still passes after the fixes.
- `npm run build` still passes after the fixes.
- The earlier app-shell hydration mismatch is no longer showing up as the active Playwright blocker after the rerun.

### Active blockers now

- `npm run test:e2e` still fails, but now on more specific downstream issues:
- Brittle Playwright selectors in grocery and premium tests:
- `e2e/grocery.spec.ts` uses broad text selectors like `text=Milk` and `text=Eggs` that now match multiple visible elements.
- `e2e/premium.spec.ts` uses broad text selectors like `text=All square.` that now match multiple visible elements.
- Sign-out interaction issue in `e2e/helpers/auth.ts`:
- The helper clicks the sign-out button, then the next click is intercepted by the dialog overlay.
- At least one premium-flow expectation may now be stale:
- `e2e/premium.spec.ts` expected an upgrade prompt and did not find it.
- `npm run lint` currently errors because ESLint tries to scan a missing `test-results` directory. This looks like a config/glob problem rather than an app-runtime problem.

### Suggested next order

1. Fix Playwright selector brittleness first.
2. Fix the sign-out helper/dialog interaction in `e2e/helpers/auth.ts`.
3. Recheck premium test assumptions and seeded state for `e2e/premium.spec.ts`.
4. Rerun `npm run test:e2e` to identify the next true blocker after the test fixes.
5. Fix the ESLint glob/config issue related to `test-results`.
6. Once E2E is materially stable, move to CI setup so build/test verification is reproducible off this machine.
7. After CI, continue the launch checklist items in order: error boundaries, security hardening, monitoring/env validation, then SEO/accessibility polish.

## 0. Current Gate

| Status | Item | Why it matters | Done when |
|---|---|---|---|
| `in_progress` | Clean verification run | We cannot call the app production-ready until build and test pass in a clean environment. | `npm run build` passes, key tests pass, and the result is repeatable. |

## 1. Release Blockers

| Status | Priority | Item | Notes | Done when |
|---|---|---|---|---|
| `done` | P1 | Fix clean production build | Verified: `npm run build` succeeds outside the sandbox. Initial failure appears to have been local file-lock behavior, not a source-level build error. | Production build succeeds locally in a clean output state and in CI. |
| `blocked` | P1 | Fix clean E2E run | Seeded-user onboarding mismatch and Neon driver transaction failure are fixed. Current blockers are now mainly Playwright selector brittleness, sign-out dialog interaction issues, and at least one stale premium-flow expectation. | Playwright runs successfully in a clean environment for core user flows. |
| `todo` | P1 | Add App Router error boundaries | Missing `error.tsx`, `global-error.tsx`, `not-found.tsx`, and likely `global-not-found.tsx`. | Runtime errors and unknown routes show controlled fallback UI. |
| `todo` | P1 | Add Content Security Policy | CSP is intentionally omitted today. | A tested CSP is present and does not break auth, Stripe, Tiptap, or charts. |
| `todo` | P1 | Harden admin authentication | Admin auth currently relies on env credentials and weak per-instance throttling. | Admin path has durable rate limiting and stronger authentication or tighter exposure controls. |
| `todo` | P1 | Stop logging PII in auth flows | Admin login logs email addresses on success/failure. | Auth logs contain no emails or other PII. |
| `todo` | P1 | Add abuse protection for expensive endpoints | Receipt scanning and similar routes need stronger throttling. | OCR and other costly routes are rate-limited or quota-limited. |

## 2. Operational Readiness

| Status | Priority | Item | Notes | Done when |
|---|---|---|---|---|
| `todo` | P1 | Add CI pipeline | No repo CI was present during audit. | Every PR runs install, lint, unit tests, and build in a clean environment. |
| `todo` | P1 | Add error reporting and monitoring | Current logging is console-only. | Server and client errors are captured in a monitoring tool with alerting. |
| `todo` | P2 | Validate required env vars | Several critical secrets exist but startup validation is not enforced. | Missing required production env vars fail fast with clear errors. |
| `todo` | P2 | Verify cron and webhook ops | Stripe and cron auth exist, but launch needs an operational check. | Webhooks and scheduled jobs are testable, observable, and documented. |
| `todo` | P2 | Confirm migration and rollback path | Database and release rollback should not be improvised on launch day. | A written deploy, migrate, and rollback procedure exists. |

## 3. Product and Platform Polish

| Status | Priority | Item | Notes | Done when |
|---|---|---|---|---|
| `todo` | P2 | Add `robots` and `sitemap` | SEO basics are missing. | Crawlers can discover canonical site metadata. |
| `todo` | P2 | Fix metadata icon paths | Layout references icon files that do not currently exist in `public`. | All referenced icons resolve correctly. |
| `todo` | P3 | Remove zoom restriction | `maximumScale: 1` hurts accessibility. | Mobile zoom behavior is user-friendly. |
| `todo` | P3 | Triage lint warnings | Current lint passes with warnings only. | Warnings are either fixed or intentionally documented. |

## 4. Work Order

1. Clean verification run
2. Fix newly exposed E2E and test-flow failures
3. Error boundaries
4. Security hardening
5. Monitoring and env validation
6. SEO and accessibility polish

## 5. Immediate Next Step

We are starting with `Clean verification run`.

Purpose:
- Prove whether the current `build` and `test:e2e` failures are true app issues or local Windows artifact locking issues.

Checks:
- Run build in a clean output state
- Run Playwright in a clean output state
- Record whether failures are environmental or code-related

Result so far:
- `npm run build` passes in a clean unrestricted run
- `npm run test:e2e` fails for real downstream issues, not just a file lock
- Seeded-user onboarding mismatch is resolved
- Neon HTTP driver transaction failure is resolved
- Current failing points are now mainly Playwright selector ambiguity, sign-out helper/dialog interaction, and at least one stale premium-flow expectation

Next:
- Resolve the newly exposed E2E and test-flow failures
- Then move immediately to CI so the clean build result is reproducible outside this machine
