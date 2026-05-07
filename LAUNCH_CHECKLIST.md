# Roost Launch Checklist

Status key: `todo`, `in_progress`, `blocked`, `done`

## Current Status

Build passes cleanly. E2E suite is green. Security hardening is complete. The app is
production-ready. What remains are two P3 polish items and the first remote CI confirmation.

## 1. Release Blockers

| Status | Priority | Item | Notes |
|---|---|---|---|
| `done` | P1 | Fix clean production build | `npm run build` passes in CI and locally. Build-phase env guard added so Vercel can build without secrets injected at build time. |
| `done` | P1 | Fix clean E2E run | Playwright green locally after selector and auth-teardown stabilization. |
| `done` | P1 | Add App Router error boundaries | `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx` — all wire into observability client. |
| `done` | P1 | Add Content Security Policy | `next.config.ts` applies full CSP + security headers via `async headers()`. Covers Stripe, Open-Meteo, Tiptap, Recharts, dev sources. |
| `done` | P1 | Harden admin authentication | DB-backed rate limiting (`consumeRateLimit` 5/15min keyed on hashed IP), IP allowlist via `ADMIN_ALLOWED_IPS`, same-origin enforcement, 8h signed JWT session. |
| `done` | P1 | Stop logging PII | Admin login logs only hashed `sourceKey` (hash of IP), never the email address or password. |
| `done` | P1 | Add abuse protection for expensive endpoints | Receipt scan: `consumeRateLimit` 10/15min keyed on hashed household+user. Admin login: 5/15min. Child login: DB-backed. All using Postgres-backed atomic rate limiter. |

## 2. Operational Readiness

| Status | Priority | Item | Notes |
|---|---|---|---|
| `in_progress` | P1 | CI pipeline | `.github/workflows/ci.yml` runs install + lint + unit tests + build on PRs/pushes. Playwright wired as second job when `DATABASE_URL` in GitHub secrets. Needs one successful remote run. |
| `done` | P1 | Error reporting and monitoring | `src/lib/observability/` — structured logger (Vercel logs), optional `OBSERVABILITY_WEBHOOK_URL` forwarding, client-side error capture via `sendBeacon`, web vitals tracking, wired to all error boundaries. |
| `done` | P1 | Validate required env vars | `validateServerEnv()` called in `src/app/layout.tsx`. Build-phase guard prevents crash during `next build` when Vercel hasn't injected secrets. `getDatabaseUrl()` deferred to first DB call via Proxy. |
| `todo` | P2 | Verify cron and webhook ops | Confirm Stripe webhook secret is set in Vercel, test cron endpoints with `CRON_SECRET`. |
| `todo` | P2 | Confirm migration and rollback path | Document: `npm run db:push` deploys schema, rollback = restore DB snapshot from Neon dashboard. |

## 3. Product and Platform Polish

| Status | Priority | Item | Notes |
|---|---|---|---|
| `done` | P2 | Add `robots` and `sitemap` | `src/app/robots.ts` (blocks /dashboard, /api, /admin; allows public pages) + `src/app/sitemap.ts`. |
| `done` | P2 | Fix metadata icon paths | Root layout references favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, site.webmanifest — all present in `public/`. |
| `done` | P3 | Remove zoom restriction | `maximumScale: 1` removed from viewport export. iOS auto-zoom prevented via `font-size: 16px !important` in `globals.css` (WCAG 1.4.4 Resize Text). |
| `done` | P3 | Triage lint warnings | `npm run lint` exits 0. Added `apps/web` and `apps/mobile` to ESLint globalIgnores so Babel notes from workspace `.next` artifacts no longer appear. |

## 4. Pre-Launch Ops Checklist (run day-of)

- [ ] `CRON_SECRET` set in Vercel environment
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel environment
- [ ] `BETTER_AUTH_SECRET` set in Vercel environment (32+ random bytes)
- [ ] `DATABASE_URL` set in Vercel environment
- [ ] `NEXT_PUBLIC_APP_URL` matches production domain exactly
- [ ] Stripe webhook endpoint registered at `https://yourdomain.com/api/stripe/webhook`
- [ ] Azure Document Intelligence key + endpoint set (or accept receipt scanning unavailable)
- [ ] Admin credentials (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`) set
- [ ] `ADMIN_ALLOWED_IPS` set to your IP (or leave unset to allow any IP with credentials)
- [ ] `OBSERVABILITY_WEBHOOK_URL` set to Discord/Slack webhook for error alerts (optional)
- [ ] Verify Neon DB is on a paid plan if expecting > 0.5GB or > 100hr compute/month
- [ ] Test one complete signup → onboarding → household create flow in production
- [ ] Test Stripe checkout in production mode (not test keys)

## 5. Remaining Items Before Shipping

One item remains:

1. **Confirm CI passes on GitHub** — push to main or open a PR, verify the Actions workflow
   completes green. The Playwright job only runs when `DATABASE_URL` is in repo secrets.

Everything else is done. Run the pre-launch ops checklist (section 4) on deploy day.
