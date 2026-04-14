# Roost

Household management for families and roommates. Chores, grocery lists, meal planning,
bill splitting, calendar, notes, and reminders — in one app.

Web-first (Next.js), then iOS and Android via Expo.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind v4, shadcn/ui |
| Database | Neon (serverless Postgres) via Drizzle ORM |
| Auth | better-auth (email/password + child PIN) |
| Payments | Stripe Checkout + webhooks |
| OCR | Azure Document Intelligence (receipt scanning) |
| Scheduling | Vercel Cron (7 jobs) |
| Email | Resend (deferred, not yet active) |
| State | TanStack Query + Zustand |
| Testing | Jest (unit), Playwright (e2e) |
| Hosting | Vercel |

---

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database (free tier works)
- npm (no yarn/pnpm — lockfile is npm)

---

## Local development setup

### 1. Clone and install

```bash
git clone <repo-url>
cd roost
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in at minimum:

```
DATABASE_URL=           # Neon connection string
BETTER_AUTH_SECRET=     # openssl rand -base64 32
BETTER_AUTH_URL=        # http://localhost:3000 for local dev
NEXT_PUBLIC_APP_URL=    # http://localhost:3000 for local dev
CRON_SECRET=            # openssl rand -base64 32 (any value works locally)
ADMIN_EMAIL=            # any email, e.g. admin@localhost
ADMIN_PASSWORD=         # any strong password
ADMIN_SESSION_SECRET=   # openssl rand -base64 32
```

Stripe and Azure keys are only needed if you are testing billing or receipt scanning.
All other features work without them.

### 3. Push schema to the database

```bash
npm run db:push
```

This creates all tables in your Neon database. Run this again any time the schema changes.

> **Warning:** Do not run `npm run db:migrate`. There is no migration journal in this repo.
> `db:push` is the only supported schema migration path.

### 4. (Optional) Seed test accounts

```bash
npm run db:seed
```

Creates fixed E2E test accounts. Only needed if you are running Playwright tests.
Never run this against the production database.

### 5. Start the dev server

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).
Admin panel runs at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Sync Drizzle schema to the database |
| `npm run db:seed` | Seed E2E test accounts (dev/staging only) |
| `npm run db:studio` | Open Drizzle Studio (local DB browser) |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Jest with coverage report |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run test:e2e:ui` | Playwright with interactive UI |

---

## Running tests

### Unit tests

```bash
npm test
```

No database connection required. Tests use mocks for all external dependencies.

### E2E tests

E2E tests require a running dev server and seeded test accounts.

```bash
# 1. Seed test accounts (first time only, or after DB reset)
npm run db:seed

# 2. Run tests (dev server starts automatically via webServer config)
npm run test:e2e
```

Playwright projects:
- `free` — chores, grocery, navigation (authenticated as free admin)
- `premium` — premium-gated features (authenticated as premium admin)
- `unauthenticated` — signup, login, onboarding flows
- `mobile` / `mobile-premium` — same flows on iPhone 14 viewport

Auth state is saved to `e2e/.auth/` (gitignored). If tests fail with auth errors,
delete the `.auth` files and re-run — global setup will recreate them.

---

## Project structure

```
src/
  app/
    (auth)/           Login, signup, child login pages
    (app)/            All authenticated app pages
    (admin)/          Internal admin panel (/admin)
    api/              API route handlers
  components/
    layout/           Shell, sidebar, top bar, bottom nav
    shared/           Reused components (SlabCard, EmptyState, etc.)
    ui/               shadcn primitives
    [feature]/        Feature-specific components
  db/
    schema/           Drizzle schema files (one per domain)
  lib/
    auth/             better-auth config + helpers
    constants/        Colors, themes, limits, premium gate config
    db/               Neon + Drizzle instance
    hooks/            Shared React hooks
    store/            Zustand stores
    utils/            Pure utilities (no DOM dependencies)
  types/              TypeScript types

drizzle/              Hand-written schema notes (not a migration chain)
e2e/                  Playwright tests
public/               Static assets
vercel.json           Cron job schedules
```

---

## Environment variables

See [`.env.example`](.env.example) for the full annotated list with required/optional
classification.

**Required for the app to work:**
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`

**Required for billing:**
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

**Required for receipt scanning:**
`AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`

**Optional for observability forwarding:**
`OBSERVABILITY_WEBHOOK_URL`, `NEXT_PUBLIC_OBSERVABILITY_ENABLED`

---

## Production deploy

See [`RUNBOOK.md`](RUNBOOK.md) for the full production deployment guide including:
- First deploy checklist
- Vercel environment variable setup
- Database migration procedure
- Stripe webhook registration
- Cron job verification
- Post-deploy smoke tests
- Rollback procedure
- Incident checklist

---

## Admin panel

The internal admin panel is at `/admin`. It is protected by `ADMIN_EMAIL` and
`ADMIN_PASSWORD` env vars (separate from user accounts). Features:
- User list with search and filters
- Household list with subscription status
- Manual premium override
- Signup and conversion charts

---

## Key design decisions

**Schema migrations:** `db:push` only. Drizzle's push command diffs the live schema and
applies changes. No migration chain exists. See `RUNBOOK.md` for the safe deploy order.

**Cron auth:** All 7 cron routes authenticate via `Authorization: Bearer <CRON_SECRET>`.
Vercel injects this header automatically. Do not pass the secret in query strings.

**Premium gating:** `households.subscription_status` is the single source of truth.
Check `useHousehold().isPremium` on the client, `requirePremium()` on the server.
Never gate features by checking individual API response fields.

**Child accounts:** Stored in both the better-auth `user` table and the app `users` table.
Child accounts have no email (placeholder `child_<id>@roost.internal`). PIN is hashed.

**Theme system:** 2 themes (default, midnight), both free. Per-user, stored in `users.theme`.
Unknown theme keys resolve to default. Theme is server-rendered on initial load.
