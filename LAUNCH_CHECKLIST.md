# Roost Launch Checklist


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
- Playwright selector brittleness in grocery, premium, chores, household, and permissions coverage was fixed.
- The sign-out helper was stabilized so auth state resets no longer get stuck behind the account dialog overlay.
- Premium-flow assertions were updated to match the current free-tier and premium-tier product behavior.
- `npm run test:e2e` now passes locally in a clean rerun.
- The ESLint `test-results` glob issue was fixed by ignoring Playwright artifact directories.
- A GitHub Actions CI workflow now runs install, lint, unit tests, and build on every PR/push, and runs Playwright when `DATABASE_URL` is available in repo secrets.
- Root App Router fallbacks were added with `src/app/error.tsx`, `src/app/global-error.tsx`, and `src/app/not-found.tsx`.

### Active blockers now

- No current local test blocker is known after the latest reruns.
- The next launch-critical work has shifted to security hardening and operational readiness:
- Add and test a Content Security Policy that is compatible with auth, Stripe, Tiptap, and charts.
- Harden admin authentication beyond env credentials plus per-instance throttling.
- Stop logging PII in auth flows.
- Add abuse protection to OCR and other expensive routes.
- Let the new CI workflow run remotely at least once and verify the secret-backed Playwright job on GitHub.

### Suggested next order

1. Let CI run on GitHub and confirm the verify job is green plus the Playwright job is enabled with repo secrets.
2. Add Content Security Policy with end-to-end testing against auth, Stripe redirects, Tiptap, and Recharts.
3. Harden admin authentication and remove PII from auth logging.
4. Add abuse protection to OCR and other expensive endpoints.
5. Add monitoring plus fail-fast env validation.
6. Finish SEO/accessibility polish.

## 0. Current Gate

| Status | Item | Why it matters | Done when |
|---|---|---|---|
| `in_progress` | Clean verification run | We cannot call the app production-ready until build and test pass in a clean environment. | `npm run build` passes, key tests pass, and the result is repeatable locally and in CI. |

## 1. Release Blockers

| Status | Priority | Item | Notes | Done when |
|---|---|---|---|---|
| `done` | P1 | Fix clean production build | Verified: `npm run build` succeeds outside the sandbox. Initial failure appears to have been local file-lock behavior, not a source-level build error. | Production build succeeds locally in a clean output state and in CI. |
| `done` | P1 | Fix clean E2E run | Full local rerun is green after stabilizing selectors, auth teardown, premium expectations, and related stale assumptions across the suite. | Playwright runs successfully in a clean environment for core user flows. |
| `done` | P1 | Add App Router error boundaries | Added `src/app/error.tsx`, `src/app/global-error.tsx`, and `src/app/not-found.tsx`. Current Next docs indicate root `app/not-found.tsx` already covers unmatched URLs, so `global-not-found.tsx` is not required here unless routing proves otherwise. | Runtime errors and unknown routes show controlled fallback UI. |
| `todo` | P1 | Add Content Security Policy | CSP is intentionally omitted today. | A tested CSP is present and does not break auth, Stripe, Tiptap, or charts. |
| `todo` | P1 | Harden admin authentication | Admin auth currently relies on env credentials and weak per-instance throttling. | Admin path has durable rate limiting and stronger authentication or tighter exposure controls. |
| `todo` | P1 | Stop logging PII in auth flows | Admin login logs email addresses on success/failure. | Auth logs contain no emails or other PII. |
| `todo` | P1 | Add abuse protection for expensive endpoints | Receipt scanning and similar routes need stronger throttling. | OCR and other costly routes are rate-limited or quota-limited. |

## 2. Operational Readiness

| Status | Priority | Item | Notes | Done when |
|---|---|---|---|---|
| `in_progress` | P1 | Add CI pipeline | `.github/workflows/ci.yml` now runs install, lint, unit tests, and build on PRs/pushes. Playwright is wired as a second job that runs when `DATABASE_URL` is present in GitHub secrets. This still needs one successful remote run to fully clear. | Every PR runs install, lint, unit tests, and build in a clean environment. |
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
2. Confirm CI runs remotely
3. Security hardening
4. Monitoring and env validation
5. SEO and accessibility polish

## 5. Immediate Next Step

We are finishing `Clean verification run` and moving into `Security hardening`.

Purpose:
- Prove whether the current `build` and `test:e2e` failures are true app issues or local Windows artifact locking issues.

Checks:
- Run build in a clean output state
- Run Playwright in a clean output state
- Record whether failures are environmental or code-related

Result so far:
- `npm run build` passes in a clean unrestricted run
- `npm run test:e2e` passes after fixing selectors, auth teardown, premium assumptions, and related stale tests
- Seeded-user onboarding mismatch is resolved
- Neon HTTP driver transaction failure is resolved
- App Router fallback UI exists for not-found and runtime error states
- CI now exists in `.github/workflows/ci.yml`, pending first remote confirmation

Next:
- Confirm the GitHub Actions workflow is green on GitHub
- Then move directly into CSP, admin auth hardening, PII log cleanup, and abuse protection
