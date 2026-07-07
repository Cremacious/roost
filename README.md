# Roost

**Home, sorted.**

![version](https://img.shields.io/badge/version-1.0.0--beta.1-orange)
![status](https://img.shields.io/badge/status-beta-yellow)
![license](https://img.shields.io/badge/license-private-lightgrey)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

Roost is the household operating system for families, roommates, and college students. It
brings chores, grocery lists, meal planning, bill splitting, a shared calendar, notes,
reminders, and tasks into one app, so a whole household can stay coordinated from a single
place.

It is built web first with Next.js, with iOS and Android planned via Expo. Pricing is per
household ($4/month for premium), not per user, so one person can pay and everyone in the
home benefits.

> Status: this is a beta release (`1.0.0-beta.1`). Expect small rough edges. Issues are
> tracked on GitHub and land between releases.

---

## Screenshots

> Placeholder. Product screenshots have not been added to the repository yet. This section
> will be updated with real captures of the dashboard, chores, money, and calendar views
> before the stable release.

<!--
When screenshots are ready, drop them in public/screenshots/ and reference them here, e.g.:

![Today dashboard](public/screenshots/today.png)
![Chores](public/screenshots/chores.png)
-->

---

## Features

Roost has a free tier and a per-household premium tier. Items marked **(Premium)** require
an active premium subscription; everything else is free.

### Chores and rewards
- Recurring household chores with per-person assignment and scheduling, plus streaks and
  points per member.
- Daily chores are free; weekly, monthly, and custom frequencies are **(Premium)**.
- Weekly points leaderboard **(Premium)**.
- Chore completion history **(Premium)**.
- Reward rules that pay out to children when they hit a chore completion threshold, with
  money rewards flowing into the settle-up ledger **(Premium)**.

### Grocery lists
- A shared default list per household with optimistic check and uncheck.
- Smart sort that groups items by store section, plus editable quick-add "common items".
- Multiple named lists **(Premium)**.

### Calendar
- Month grid and agenda views with attendees and RSVP.
- Recurring events (daily, weekly, biweekly, monthly, yearly) with flexible end conditions
  **(Premium)**.

### Money and bill splitting
- Expense tracking and bill splitting with debt simplification and a two-sided settle-up
  flow. Creating and splitting expenses is free.
- Budgets, savings goals, recurring expenses and bills, spending insights, receipt scanning,
  and CSV/PDF export **(Premium)**.

### Meals
- Weekly meal planner, a searchable meal bank, and household meal suggestions with voting.
- Push meal ingredients straight to the grocery list.
- The meal bank is capped on the free tier; unlimited meals are **(Premium)**.

### Notes
- Quick add plus a masonry board of notes.
- Rich text editing (headings, checklists, links) **(Premium)**; plain text is free.

### Reminders
- One-time and recurring reminders with self, specific-member, or household notify types.
- Due reminders surface in-app on the Today page.
- Free tier is limited to one-time, self-notify reminders with up to five active at once;
  recurring and notify-others are **(Premium)**.

### Tasks
- One-off to-dos with assignee, due date, and priority, plus subtasks, comments,
  delegations, and projects.

### Household management
- Email/password accounts and PIN-only child accounts (with in-place upgrade to a full
  account).
- Roles (child, member, admin) with a per-user permission checklist.
- Guest and temporary members via invite link or code **(Premium)**.
- Belonging to multiple households **(Premium)**.

### Insights and admin
- A premium household stats page with charts across every feature **(Premium)**.
- A separate internal admin panel at `/admin` (own credentials) for user and household
  management, manual premium overrides, promo codes, and signup and conversion charts.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Lucide icons |
| Animation | framer-motion |
| Database | Neon (serverless PostgreSQL) via Drizzle ORM |
| Auth | better-auth (email/password, PIN child login, optional Google and Apple) |
| Data fetching | TanStack Query |
| Client state | Zustand |
| Rich text | Tiptap |
| Charts | Recharts |
| Payments | Stripe (Checkout, webhooks, Customer Portal) |
| Receipt OCR | Azure Document Intelligence (prebuilt-receipt) |
| PDF export | pdfkit |
| Email | Resend (transactional: invites, password reset) |
| Weather | Open-Meteo (free, no API key) |
| Scheduling | Vercel Cron (8 jobs) |
| Hosting | Vercel |
| Testing | Playwright (end-to-end) |

The repository is an npm workspace. The web app lives at the root (`src/`); `apps/mobile`
holds the future Expo app and `packages/*` holds shared code (`api-types`, `constants`,
`utils`).

---

## Getting started

### Prerequisites

- Node.js 20 or newer (required by Next.js 16).
- npm (the repo uses `package-lock.json`).
- A [Neon](https://neon.tech) PostgreSQL database (the free tier is enough). Use the pooled
  connection string (hostname contains `-pooler`).

### 1. Install

```bash
git clone https://github.com/Cremacious/roost.git
cd roost
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`. See [Environment variables](#environment-variables)
below and the annotated [`.env.example`](.env.example) for details. `validateEnv()` runs at
server boot and throws if a required variable is missing, so the app will not start until
every required value is set.

### 3. Push the schema to your database

```bash
npm run db:push
```

This syncs the Drizzle schema to your Neon database. Run it again whenever the schema
changes. There is no migration journal; `db:push` is the schema sync path.

### 4. (Optional) Seed test data

```bash
npm run db:seed
```

Creates the fixed QA accounts and sample content used by the end-to-end tests. Only needed
for testing or a populated local playground. Never run this against production.

### 5. Run the dev server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) and the admin panel at
[http://localhost:3000/admin](http://localhost:3000/admin).

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`. The file is annotated with where each
value comes from.

### Required (the app will not boot without these)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | Secret used to sign auth sessions (32+ chars). |
| `BETTER_AUTH_URL` | Canonical deployed base URL (no trailing slash). |
| `NEXT_PUBLIC_APP_URL` | Public base URL for invite links and redirects. |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode until you go live). |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe webhook endpoint. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side). |
| `STRIPE_PRICE_ID` | Price ID for the $4/month subscription. |
| `CRON_SECRET` | Bearer token that authenticates `/api/cron/*` routes. |

### Optional (each feature stays disabled until its variables are set)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend key for transactional email. Missing means those emails are skipped. |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | Azure key for receipt scanning. |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | Azure Document Intelligence endpoint. |
| `EXPO_ACCESS_TOKEN` | Expo push token for the future mobile app. |
| `ADMIN_EMAIL` | Login email for the `/admin` panel. |
| `ADMIN_PASSWORD` | Login password for the `/admin` panel. |
| `ADMIN_JWT_SECRET` | Optional signing secret for admin JWTs; falls back to `BETTER_AUTH_SECRET`. |
| `GOOGLE_AUTH_CLIENT_ID` | Enables "Continue with Google" (both Google vars required). |
| `GOOGLE_AUTH_CLIENT_SECRET` | Google OAuth client secret. |
| `APPLE_CLIENT_ID` | Enables Apple sign-in (all four Apple vars required). |
| `APPLE_TEAM_ID` | Apple team ID. |
| `APPLE_KEY_ID` | Apple key ID. |
| `APPLE_PRIVATE_KEY` | Apple private key. |

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm run start` | Start the production server locally. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Type-check with `tsc --noEmit`. |
| `npm run db:push` | Sync the Drizzle schema to the database. |
| `npm run db:generate` | Generate Drizzle artifacts from the schema. |
| `npm run db:migrate` | Run the SQL migration scripts in `scripts/migrate.ts`. |
| `npm run db:studio` | Open Drizzle Studio to browse the database. |
| `npm run db:seed` | Seed the QA test accounts and sample data. |
| `npm run test:e2e` | Run the Playwright end-to-end suite. |
| `npm run test:e2e:ui` | Run Playwright with the interactive UI. |
| `npm run test:e2e:headed` | Run Playwright in headed mode. |

---

## Testing

End-to-end tests use [Playwright](https://playwright.dev). They require seeded test accounts;
global setup seeds the database and signs in the fixture accounts before the suite runs.

```bash
# Seed test data (first run, or after a database reset)
npm run db:seed

# Run the suite (the dev server starts automatically via the webServer config)
npm run test:e2e
```

Playwright projects include `free`, `premium`, `unauthenticated`, and their mobile
counterparts (iPhone 14 viewport). Saved auth state lives in `e2e/.auth/` (gitignored); if a
run fails with auth errors, delete those files and re-run so global setup recreates them.

Before pushing, it is also worth running the static checks:

```bash
npm run lint
npm run typecheck
npm run build
```

---

## Deployment

Roost deploys to [Vercel](https://vercel.com), with schema changes applied to Neon via
`npm run db:push` and eight scheduled jobs defined in [`vercel.json`](vercel.json). For the
full, ordered production runbook (environment setup, Stripe and Azure wiring, cron
verification, smoke tests, and rollback), see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Project structure

```
src/
  app/
    (auth)/          Login, signup, child login
    (app)/           Authenticated app pages (today, chores, lists, calendar,
                     money, meals, notes, reminders, tasks, household, stats, settings)
    (admin)/         Internal admin panel (/admin)
    api/             API route handlers (includes api/cron/* scheduled jobs)
    invite/          Public invite landing page
  components/
    layout/          Shell, sidebar, top bar, bottom nav
    shared/          Reused components (SlabCard, EmptyState, DraggableSheet, etc.)
    ui/              shadcn primitives
    <feature>/       Feature-specific components (chores, money, meals, ...)
  db/
    schema/          Drizzle schema files, split by domain
  lib/
    auth/            better-auth config and helpers
    constants/       Colors, plan limits, premium gate config
    db/              Neon + Drizzle instance
    hooks/           Shared React hooks
    store/           Zustand stores
    utils/           Pure utilities (no DOM dependencies)
  proxy.ts           Route protection and onboarding guard (Next.js 16 middleware)

apps/mobile          Future Expo app (workspace)
packages/            Shared workspace packages (api-types, constants, utils)
e2e/                 Playwright tests
docs/                Deployment runbook and design reference
vercel.json          Cron job schedules
```

---

## Contributing

- Issues and pull requests are tracked on the
  [GitHub repository](https://github.com/Cremacious/roost).
- [`docs/design-reference.html`](docs/design-reference.html) is the design source of truth
  (component gallery, colors, and layout rules). Open it in a browser when building UI.
- [`CHANGELOG.md`](CHANGELOG.md) records release history and the versioning process.
- Project conventions and architecture notes live in `CLAUDE.md` at the repository root.

---

## License

Private and proprietary. All rights reserved. This repository is not open source and is not
licensed for redistribution or reuse.
