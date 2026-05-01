# Technology Stack

**Analysis Date:** 2026-05-01

## Languages

**Primary:**
- TypeScript 5.x — all source files under `src/`, config files, schema definitions

**Secondary:**
- CSS — `src/app/globals.css` (Tailwind v4 + custom CSS variables + shadcn overrides)

## Runtime

**Environment:**
- Node.js v24 (active LTS inferred from local runtime; no `.nvmrc` pinned)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.2.2 — App Router, React Server Components, API Routes (`src/app/`)
- React 19.2.4 — UI rendering; concurrent features available
- Tailwind CSS v4 — utility-first styling via `@tailwindcss/postcss`

**State Management:**
- Zustand 5.0.12 — client state; theme store at `src/lib/store/themeStore.ts`
- TanStack Query 5.96.2 — server state, 10s polling; client configured in `src/components/shared/QueryProvider.tsx`

**Animation:**
- framer-motion 12.38.0 — page enter animations, list stagger, whileTap press effects

**Rich Text:**
- Tiptap 3.22.x — rich text editor for notes; extensions: blockquote, code-block, heading, link, placeholder, task-item, task-list, starter-kit; editor component at `src/components/notes/RichTextEditor.tsx`

**Charts:**
- Recharts 3.8.1 — AreaChart, DonutChart, HorizontalBarChart on stats and admin pages

**UI Components:**
- shadcn/ui 4.1.2 — component primitives scaffolded into `src/components/ui/`
- Radix UI 1.4.3 — underlying Radix primitives
- Lucide React 1.7.0 — all icons (no emojis used anywhere)
- react-day-picker 9.14.0 — calendar date picker in EventSheet
- vaul 1.1.2 — drawer/sheet primitive underlying DraggableSheet
- sonner 2.0.7 — toast notifications; Toaster mounted in `src/app/layout.tsx`

**Forms / Validation:**
- Zod 4.3.6 — schema validation for API inputs

**PDF Generation:**
- pdf-lib 1.17.1 — expense export to PDF at `src/app/api/expenses/export/route.ts`

## Testing

**Unit / Component:**
- Jest 30.3.0 — test runner; config at `jest.config.ts`
- ts-jest 29.4.9 — TypeScript transformer for Jest
- jest-environment-jsdom 30.3.0 — browser-like DOM environment
- @testing-library/react 16.3.2 — component rendering
- @testing-library/jest-dom 6.9.1 — DOM matchers
- @testing-library/user-event 14.6.1 — user interaction simulation
- Test files located in `src/__tests__/`

**E2E:**
- Playwright 1.59.1 — end-to-end browser tests; config at `playwright.config.ts`
- Test files in `e2e/`; 5 projects: free (desktop Chrome), premium (desktop Chrome), unauthenticated (desktop Chrome), mobile (iPhone 14), mobile-premium (iPhone 14)
- Serial execution: `fullyParallel: false`, `workers: 1`
- Global setup: `e2e/global-setup.ts` seeds DB + saves auth state to `e2e/.auth/`

**Run Commands:**
```bash
npm test                    # Unit tests (Jest)
npm run test:watch          # Jest watch mode
npm run test:coverage       # Jest with coverage
npm run test:e2e            # Playwright E2E
npm run test:e2e:ui         # Playwright with UI runner
npm run test:e2e:headed     # Playwright headed browser
```

## Key Dependencies

**Critical:**
- `better-auth` 1.5.6 — authentication; email+password + optional Google OAuth; session management; config at `src/lib/auth/index.ts`
- `drizzle-orm` 0.45.2 — type-safe ORM; all DB queries; schema at `src/db/schema/`
- `@neondatabase/serverless` 1.0.2 — Neon serverless PostgreSQL driver over HTTP; client at `src/lib/db/index.ts`
- `stripe` 22.0.0 — Stripe Checkout + webhooks + Customer Portal; API version 2024-12-18.acacia; utils at `src/lib/utils/stripe.ts`
- `@azure/ai-form-recognizer` 5.1.0 — Azure Document Intelligence SDK; prebuilt-receipt model; util at `src/lib/utils/azureReceipts.ts`
- `resend` 6.10.0 — transactional email (password reset only); client at `src/lib/email/auth-emails.ts`

**Infrastructure:**
- `date-fns` 4.1.0 — all date arithmetic (startOfDay, endOfDay, format, etc.)
- `class-variance-authority` 0.7.1 — variant-based className composition (shadcn)
- `clsx` 2.1.1 + `tailwind-merge` 3.5.0 — conditional/merged Tailwind class strings
- `drizzle-kit` 0.31.10 — schema introspection + `db:push` migration (no migration files)
- `jose` — JWT signing for admin sessions (`src/lib/admin/auth.ts`)
- `next-themes` 0.4.6 — imported but theme logic primarily handled by custom ThemeProvider

## Configuration

**Environment:**
- Loaded from `.env.local` (development) or Vercel environment variables (production)
- Validated at startup by `validateServerEnv()` in `src/lib/env.ts`; throws in production if required vars missing
- Client-safe vars prefixed `NEXT_PUBLIC_`
- `.env.example` at repo root documents all required/optional vars

**Required for core operation:**
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — session signing secret
- `BETTER_AUTH_URL` — auth base URL
- `NEXT_PUBLIC_APP_URL` — canonical app URL
- `CRON_SECRET` — secures Vercel cron endpoints

**Optional integrations (app degrades gracefully without):**
- Stripe vars — billing disabled if missing/placeholder
- Azure vars — receipt scanning disabled if missing/placeholder
- `RESEND_API_KEY` + `AUTH_EMAIL_FROM` — password reset email disabled
- `OBSERVABILITY_WEBHOOK_URL` — observability forwarding disabled
- `GOOGLE_AUTH_CLIENT_ID` + `GOOGLE_AUTH_CLIENT_SECRET` — Google OAuth only active if both present
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` — superadmin panel disabled
- `ADMIN_ALLOWED_IPS` — optional IP allowlist for `/admin`

**Build:**
- `next.config.ts` — security headers (X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy), local image patterns
- `drizzle.config.ts` — schema path `./src/db/schema/index.ts`, dialect postgresql, no migration files
- `tsconfig.json` — path alias `@/` → `src/`
- `tailwind.config` — Tailwind v4, configured via `@tailwindcss/postcss`

## Platform Requirements

**Development:**
- Node.js ≥ 18 (Next.js 16 requirement; v24 in active use)
- npm for package management
- Neon DB connection (free tier sufficient)
- `.env.local` with at minimum `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`

**Production:**
- Vercel (hobby tier free) — handles HSTS, HTTPS, edge deployment
- Neon PostgreSQL (free tier: 0.5GB)
- Vercel Cron for 7 scheduled jobs defined in `vercel.json`
- Domain with HTTPS for Stripe webhooks

## Database Schema Management

- Schema-first via Drizzle; all tables in `src/db/schema/` split by domain
- **No migration files** — `npm run db:push` (drizzle-kit push) is the only migration path
- Always run `npm run db:push` after any schema change to sync Neon
- Seed script: `npm run db:seed` runs `src/db/seed.ts` (idempotent, uses `tsx --env-file=.env.local`)

## Font

- Nunito (400–900 weights) loaded via `next/font/google` in `src/app/layout.tsx`
- CSS variable: `--font-nunito`
- Only weights 600/700/800/900 used in UI
- Geist Mono loaded for monospace contexts (promo codes, PIN display)

---

*Stack analysis: 2026-05-01*
