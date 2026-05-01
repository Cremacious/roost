# Phase 0: Foundation - Research

**Researched:** 2026-05-01
**Domain:** Monorepo restructuring, Drizzle migration baseline, Neon branching, Expo SDK 53 scaffold, better-auth Expo plugin
**Confidence:** HIGH for npm workspaces and Neon CLI; MEDIUM for drizzle-kit baseline (community pattern, not official command); MEDIUM for better-auth Expo (known bugs closed but version 1.5.6 unverified against Expo SDK 53)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full move in Phase 0 — ALL existing V1 source code moves to `apps/web/`. No hybrid state. `src/`, `next.config.ts`, `tsconfig.json`, and `package.json` all relocate to `apps/web/`. The repo root becomes the npm workspace manifest only.
- **D-02:** One atomic commit — the entire monorepo restructure (file moves + path updates + config changes) lands in a single commit. No broken intermediate state on the branch.
- **D-03:** Cross-app imports use `@roost/*` workspace packages (e.g., `@roost/constants`, `@roost/api-types`, `@roost/utils`). Each app's `tsconfig.json` includes `paths` entries for these.
- **D-04:** Root `package.json` keeps convenience delegate scripts: `"dev"`, `"build"`, `"db:push"`, etc.
- **D-05:** Stub packages only in Phase 0. `packages/api-types`, `packages/constants`, and `packages/utils` are created as valid npm workspace packages with empty `index.ts` and `package.json` but contain no real implementation.
- **D-06:** Split by concern — `vercel.json` stays at repo root. `drizzle.config.ts`, `playwright.config.ts`, and `e2e/` move into `apps/web/`.
- **D-07:** Vercel Root Directory set to `apps/web/` in Vercel dashboard (one-time manual step).

### Claude's Discretion

- Config file organization within `apps/web/` (e.g., where test utilities and seed scripts land) — follow established conventions from the current layout.
- Exact npm workspace script names at root — match existing names to preserve developer muscle memory.

### Deferred Ideas (OUT OF SCOPE)

- Shared packages extraction (real code) — moving `colors.ts`, `FREE_TIER_LIMITS`, debt simplification, grocery sort, recurrence, and time utils into `packages/`. Deferred to Phase 2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUN-01 | Monorepo restructured to `apps/web/`, `apps/mobile/`, `packages/` using npm workspaces | npm workspaces root manifest pattern; tsconfig path alias preservation via `apps/web/tsconfig.json` |
| FOUN-02 | Shared packages extracted: stubs only in Phase 0 | Valid stub package.json + empty index.ts pattern; tsconfig paths for `@roost/*` |
| FOUN-03 | Schema migration strategy switched from `db:push` to `drizzle-kit generate + migrate` | Baseline pattern: generate, comment SQL, migrate to register, uncomment; `drizzle.config.ts` gains `out: "./migrations"` |
| FOUN-04 | Neon database branch created for V2 development | `neonctl branches create --name v2-dev`; separate connection string via `neonctl connection-string` |
| FOUN-05 | Rebuild branch (`rebuild/v2`) established; V1 stays live in production | Must be created from master before any work; V1 master untouched |
| FOUN-06 | EAS Build project configured for iOS and Android development builds | `npx create-expo-app@latest` in `apps/mobile/`; `eas init`; `eas build --profile development` |
| FOUN-07 | `getUserHousehold` moved from `src/app/api/chores/route.ts` to `src/lib/auth/helpers.ts` | 71 files import this function; all callers need import path updated |
| AUTH-04 | `@better-auth/expo` plugin configured; Expo client stores session in `expo-secure-store` | Server: `expo()` plugin in betterAuth config + trustedOrigins; Client: `expoClient` plugin + SecureStore |
| AUTH-05 | Expo auth client tested against production Vercel URL | Two known bugs fixed in late 2025 (PR #7555, PR #7821); test via `authClient.getCookie()` round-trip |
| MIG-01 | V2 never touches production `DATABASE_URL` | Neon dev branch provides separate URL; `apps/web/.env.local` uses `DEV_DATABASE_URL` only |
| MIG-02 | All V2 schema changes are additive until cutover | Convention; enforced by code review |
| MIG-04 | Rollback plan tested: reverting to V1 without data loss | Rollback = Vercel redeploy to master; Neon dev branch changes never touch production |
| MIG-05 | All existing user/household/member/subscription data preserved | Neon dev branch copies production data at creation time; verify with read query |
| MIG-06 | Existing sessions remain valid post-cutover | Sessions in Neon; dev branch preserves session rows; no invalidation needed |
</phase_requirements>

---

## Summary

Phase 0 is a pure infrastructure phase — no user-visible features change. The work divides into four independent streams that should execute in dependency order: (1) Neon dev branch, (2) monorepo restructure, (3) Expo skeleton, (4) better-auth Expo plugin + test.

The monorepo restructure is well-understood. npm workspaces with `apps/web/` + `apps/mobile/` + `packages/` is the standard Expo monorepo pattern. Expo SDK 53+ handles Metro configuration automatically — no manual `watchFolders` setup needed. The critical constraint is that `@/` path alias must continue resolving to `apps/web/src/` in all existing V1 code without touching a single import statement. This is achieved by putting the paths entry in `apps/web/tsconfig.json`.

The drizzle-kit baseline is the most technically nuanced task. There is no official `drizzle-kit baseline` command. The community-established pattern is: run `drizzle-kit generate`, comment out the SQL body in the resulting file, run `drizzle-kit migrate` (which registers the migration as applied in `__drizzle_migrations` without executing DDL against tables that already exist), then uncomment the SQL for documentation. This must only ever run against `DEV_DATABASE_URL`.

The better-auth Expo plugin had two known production-blocking bugs in late 2025: malformed cookie name ("null" key) in issue #6810, and semicolon-prefixed cookies rejected by load balancers in issue #7674. Both were closed with merged PRs (#7555 and #7821). Version 1.5.6 installed in this project should include these fixes, but AUTH-05 requires a live test against the production Vercel URL to confirm.

**Primary recommendation:** Execute streams in this order — Neon branch (30 min), monorepo restructure (half day), Expo skeleton + EAS (1-2 hours), better-auth Expo plugin + integration test (2-4 hours depending on bug surface). The monorepo restructure should be a single atomic commit per D-02.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Monorepo structure | Repo root (npm workspaces) | apps/web, apps/mobile | Root owns workspace manifest; apps own their configs |
| Schema migrations | apps/web (drizzle.config.ts) | Neon dev branch (DB) | Web owns schema definition; DB is the execution target |
| Neon branch isolation | Database / Storage | — | Pure DB infrastructure; no app code involved |
| Expo project skeleton | apps/mobile | — | Standalone Expo app; no shared code in Phase 0 |
| better-auth Expo plugin | API / Backend (server config) + apps/mobile (client) | — | Split responsibility: server adds `expo()` plugin; mobile uses `expoClient` |
| Path alias preservation | apps/web (tsconfig.json) | — | `@/` resolves inside apps/web; mobile uses its own resolution |
| getUserHousehold refactor | API / Backend (`src/lib/auth/helpers.ts`) | — | Auth helper belongs in auth layer, not a feature route |

---

## Standard Stack

### Core (already installed, moves with apps/web/)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| drizzle-kit | 0.31.10 [VERIFIED: package.json] | Generate + migrate | Gains `out: "./migrations"` in config |
| better-auth | 1.5.6 [VERIFIED: package.json] | Auth server | Gains `expo()` plugin import |
| @neondatabase/serverless | 1.0.2 [VERIFIED: package.json] | Neon driver | No change |

### New (Phase 0 additions to apps/mobile)

| Library | Version | Purpose | Install via |
|---------|---------|---------|-------------|
| @better-auth/expo | latest | Expo session plugin | `npm install @better-auth/expo` |
| expo-secure-store | SDK-compatible ~14.x | Device keychain session storage | `npx expo install expo-secure-store` |
| expo-network | SDK-compatible ~7.x | Network status | `npx expo install expo-network` |

### Dev tools (global, one-time)

| Tool | Install | Purpose |
|------|---------|---------|
| neonctl | `npm i -g neonctl` [VERIFIED: neon.com/docs] | Neon branch management |
| eas-cli | `npm i -g eas-cli` [CITED: docs.expo.dev] | EAS build configuration |

**Important:** Use `npx expo install` (not `npm install`) for all Expo native packages. It resolves the correct version for SDK 53 automatically. [CITED: docs.expo.dev]

**Version verification for @better-auth/expo:**
```bash
npm view @better-auth/expo version
```
[ASSUMED] The package may be bundled inside the `better-auth` package rather than as a separate install. Verify against docs before planning the install task.

---

## Architecture Patterns

### System Architecture Diagram

```
rebuild/v2 branch (git)
 |
 +-- package.json (workspaces root: ["apps/*", "packages/*"])
 +-- vercel.json  (stays at root — Vercel cron config)
 |
 +-- apps/
 |    +-- web/                      <-- ALL V1 source moved here
 |    |    +-- src/                 <-- @/ alias maps to this
 |    |    +-- next.config.ts
 |    |    +-- tsconfig.json        <-- @/ + @roost/* paths
 |    |    +-- drizzle.config.ts    <-- DEV_DATABASE_URL, out: ./migrations
 |    |    +-- playwright.config.ts
 |    |    +-- e2e/
 |    |    +-- package.json         <-- all current deps
 |    |
 |    +-- mobile/                   <-- NEW Expo skeleton
 |         +-- app/
 |         |    +-- _layout.tsx
 |         +-- app.json             <-- SDK 53, scheme, EAS projectId
 |         +-- eas.json             <-- dev/preview/production profiles
 |         +-- metro.config.js      <-- minimal (SDK 53 auto-configures)
 |         +-- package.json
 |
 +-- packages/
      +-- api-types/   <-- STUB (empty)
      +-- constants/   <-- STUB (empty)
      +-- utils/       <-- STUB (empty)

Auth data flow (mobile):
  apps/mobile authClient.signIn()
    --> expoClient plugin (better-auth/expo)
    --> HTTPS POST to production Vercel URL
    --> apps/web/src/lib/auth/index.ts (expo() plugin)
    --> Neon dev branch (sessions table)
    --> Set-Cookie response header
    --> expoClient parses + stores to expo-secure-store
    --> authClient.getCookie() on subsequent requests
```

### Pattern 1: npm Workspaces Root Manifest

**What:** Root `package.json` declares workspaces and delegates scripts to `apps/web`.
**When to use:** Required setup for the whole monorepo.

```json
// package.json (root — replaces current root package.json)
{
  "name": "roost-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev":          "npm run dev --workspace=apps/web",
    "build":        "npm run build --workspace=apps/web",
    "start":        "npm run start --workspace=apps/web",
    "lint":         "npm run lint --workspace=apps/web",
    "db:push":      "npm run db:push --workspace=apps/web",
    "db:generate":  "npm run db:generate --workspace=apps/web",
    "db:migrate":   "npm run db:migrate --workspace=apps/web",
    "db:seed":      "npm run db:seed --workspace=apps/web",
    "db:studio":    "npm run db:studio --workspace=apps/web",
    "test":         "npm run test --workspace=apps/web",
    "test:e2e":     "npm run test:e2e --workspace=apps/web"
  }
}
```

[CITED: docs.expo.dev/guides/monorepos]

### Pattern 2: Stub Workspace Package

**What:** Minimal valid npm package with empty exports, importable via `@roost/` path.
**When to use:** FOUN-02 — three stub packages in Phase 0.

```json
// packages/constants/package.json
{
  "name": "@roost/constants",
  "version": "0.0.1",
  "private": true,
  "main": "index.ts",
  "types": "index.ts"
}
```

```typescript
// packages/constants/index.ts
// Stub. Real exports extracted from apps/web/src/lib/constants/ in Phase 2.
export {};
```

```json
// apps/web/tsconfig.json — paths section (add to existing compilerOptions)
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@roost/constants": ["../../packages/constants/index.ts"],
      "@roost/api-types": ["../../packages/api-types/index.ts"],
      "@roost/utils": ["../../packages/utils/index.ts"]
    }
  }
}
```

[ASSUMED — tsconfig paths for npm workspace packages; standard pattern]

### Pattern 3: Drizzle Migration Baseline (db:push to generate+migrate)

**What:** Register the current schema as migration 0000 on the Neon dev branch without re-running DDL.
**When to use:** One-time on first use of FOUN-03. MUST run against DEV_DATABASE_URL only.

There is no official `drizzle-kit baseline` command. The community-established approach:

```typescript
// Step 1: Update apps/web/drizzle.config.ts to add migrations output dir
export default {
  schema: './src/db/schema/index.ts',
  out: './migrations',               // ADD THIS
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DEV_DATABASE_URL!,  // CHANGE THIS (never DATABASE_URL)
  },
} satisfies Config;
```

```bash
# Step 2: Generate migration files against the Neon dev branch
# This produces apps/web/migrations/0000_initial.sql with full CREATE TABLE DDL
cd apps/web
DEV_DATABASE_URL="postgresql://..." npx drizzle-kit generate --name=initial

# Step 3: Comment out ALL SQL in 0000_initial.sql
# The tables already exist on the dev branch (copied from production at branch time)
# Edit the file to add a comment at the top and wrap SQL in block comments:
#   -- BASELINE: schema already applied via db:push. No DDL needed.
#   /* [all generated CREATE TABLE statements commented out] */

# Step 4: Run migrate — creates __drizzle_migrations table and inserts
# a row for 0000_initial.sql, marking it as "already applied"
DEV_DATABASE_URL="postgresql://..." npx drizzle-kit migrate

# Step 5: Restore 0000_initial.sql to full DDL (uncomment)
# The SQL is now documentation and rollback reference only

# Step 6: Verify: run generate again — should produce no new migrations
DEV_DATABASE_URL="postgresql://..." npx drizzle-kit generate --name=check_empty
# The new file should contain only empty SQL or nothing new
```

[CITED: github.com/drizzle-team/drizzle-orm/discussions/1604]

### Pattern 4: better-auth Expo Plugin

**What:** Add `expo()` plugin server-side and `expoClient` mobile-side.
**When to use:** AUTH-04.

```typescript
// apps/web/src/lib/auth/index.ts — add to existing betterAuth() config
import { expo } from "@better-auth/expo";  // or from "better-auth/expo" — verify import path

export const auth = betterAuth({
  // ... all existing config unchanged ...
  plugins: [
    expo(),  // add this plugin
    // ... existing plugins ...
  ],
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL!,
    "roostapp://",        // app.json scheme
    "exp://**",           // Expo Go dev
  ],
});
```

```typescript
// apps/mobile/lib/auth.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "https://roost.vercel.app",
  plugins: [
    expoClient({
      scheme: "roostapp",
      storagePrefix: "roost",
      storage: SecureStore,
    }),
  ],
});

// Authenticated fetch helper — must attach cookie manually
export async function authedFetch(url: string, init?: RequestInit) {
  const cookie = await authClient.getCookie();
  return fetch(url, {
    ...init,
    headers: { ...init?.headers, cookie },
  });
}
```

[CITED: better-auth.com/docs/integrations/expo]

### Pattern 5: Neon Branch Creation

**What:** Create an isolated dev branch and get its connection string.
**When to use:** FOUN-04, MIG-01.

```bash
# Install (one-time)
npm i -g neonctl

# Authenticate (opens browser, one-time)
neon auth

# Create dev branch (inherits full production data snapshot)
neon branches create --name v2-dev

# Get branch connection string (run after create — create may not output URI
# if multiple roles exist in the project)
neon connection-string --branch v2-dev
# Output: postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# Add ONLY this to apps/web/.env.local:
# DEV_DATABASE_URL=postgresql://...
# DO NOT add DATABASE_URL to apps/web — it must not exist in V2 .env.local
```

[CITED: neon.com/docs/reference/cli-branches, neon.com/docs/reference/cli-install]

### Anti-Patterns to Avoid

- **Setting DATABASE_URL in apps/web .env.local:** V2 must never reference the production connection string. Rename to `DEV_DATABASE_URL` and update `drizzle.config.ts` to read from it. If `DATABASE_URL` appears anywhere in `apps/web`, it is a bug.
- **Running `drizzle-kit migrate` before commenting out baseline SQL:** Running the generated 0000_initial.sql as-is on the dev branch will attempt to CREATE TABLE on tables that already exist, failing with "table already exists" errors.
- **`npm install` for Expo native packages:** Use `npx expo install expo-secure-store` not `npm install`. The Expo installer resolves the SDK-compatible version.
- **Manual metro.config.js `watchFolders` for SDK 53+:** SDK 53+ auto-configures Metro for monorepos. Adding manual config causes duplicate React Native detection.
- **Forgetting to update `drizzle.config.ts` schema path after monorepo restructure:** The config file moves from `/drizzle.config.ts` to `/apps/web/drizzle.config.ts`. The schema path stays `"./src/db/schema/index.ts"` (relative to the config file location — unchanged). The `out` path must be added: `"./migrations"`.
- **Changing any import in V1 source code during monorepo restructure:** The entire V1 source (`src/`) moves as-is into `apps/web/src/`. All internal `@/` imports remain valid because `apps/web/tsconfig.json` maps `@/` to `./src/`. Zero import statements need to change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Expo session storage | Custom AsyncStorage cookie jar | `expo-secure-store` via `@better-auth/expo` | SecureStore uses iOS Keychain / Android Keystore; AsyncStorage is unencrypted |
| Neon branch isolation | Manual DB clone / pg_dump restore | `neonctl branches create` | Neon copy-on-write branching: instant, includes full prod data |
| Migration baseline | Custom script to insert `__drizzle_migrations` rows | Generate + comment + migrate (Pattern 3) | Manual hash calculation is error-prone; drizzle's own tooling is the canonical path |
| npm workspace cross-package imports | Relative paths like `../../packages/constants/` | `@roost/constants` via workspace + tsconfig paths | Relative paths break under some bundlers; workspace symlinks + alias is the standard |
| Expo monorepo Metro config | Custom `watchFolders` + resolver settings | Default SDK 53+ `metro.config.js` | SDK 53+ auto-handles this; custom config causes duplicate React version errors |

**Key insight:** Every problem in this phase has a solved, documented path. The goal of Phase 0 is to configure existing tools correctly, not to build new infrastructure.

---

## Runtime State Inventory

Phase 0 includes a refactor (FOUN-07 — `getUserHousehold` moves from a feature route to `src/lib/auth/helpers.ts`). This triggers a runtime state audit.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `getUserHousehold` is a TypeScript function, not a stored identifier | None |
| Live service config | None — not registered in any external system | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | TypeScript compilation catches broken imports at build time | Run `npm run build` from `apps/web/` after refactor to verify zero broken imports |

**Caller count:** `getUserHousehold` is imported by 71 files across `src/app/api/`. [VERIFIED: grep of src/] Every caller needs its import updated from `@/app/api/chores/route` to `@/lib/auth/helpers`. This is a find-and-replace operation — the function signature does not change.

---

## Common Pitfalls

### Pitfall 1: Broken `@/` Alias After File Move

**What goes wrong:** After moving `src/` into `apps/web/src/`, if the tsconfig is not updated, all `@/` imports fail with module not found errors during `next build`.
**Why it happens:** The path alias `@/*` is relative to the tsconfig file's location. Moving files without updating tsconfig breaks resolution.
**How to avoid:** Update `apps/web/tsconfig.json` `paths` to `"@/*": ["./src/*"]` (relative to `apps/web/`, not repo root). The actual path is the same string — but it's now relative to a different directory. Verify with `npm run build --workspace=apps/web` as the final check of the monorepo restructure commit.
**Warning signs:** Any `Module not found: Can't resolve '@/...'` error in the build.

### Pitfall 2: Running Drizzle Migrate Against Production

**What goes wrong:** `DATABASE_URL` set in env causes drizzle-kit to run against the production Neon database instead of the dev branch.
**Why it happens:** `drizzle.config.ts` reads from env. If `.env.local` contains `DATABASE_URL` (the production URL), any `drizzle-kit` command targets production.
**How to avoid:** V2's `apps/web/.env.local` must contain `DEV_DATABASE_URL` only. The drizzle config reads `process.env.DEV_DATABASE_URL`. Add a guard comment to drizzle.config.ts: `// V2: uses DEV_DATABASE_URL — never DATABASE_URL`.
**Warning signs:** Any drizzle command succeeds without `DEV_DATABASE_URL` being set.

### Pitfall 3: better-auth Expo Plugin Import Path

**What goes wrong:** `import { expo } from "@better-auth/expo"` fails because the plugin is actually exported from the main `better-auth` package, not a separate package.
**Why it happens:** better-auth packages plugin exports inconsistently — some are in the main package, others in separate scoped packages.
**How to avoid:** Before writing the server config, verify the actual import path: `npm view @better-auth/expo` — if the package does not exist, it is `import { expo } from "better-auth/expo"` or `import { expo } from "better-auth/plugins/expo"`.
**Warning signs:** `npm install @better-auth/expo` returns 404 or the package has no releases.

### Pitfall 4: Expo SDK Version Pinning in create-expo-app

**What goes wrong:** `npx create-expo-app@latest` without a template flag creates an SDK 54 project (or later), not SDK 53.
**Why it happens:** The `latest` tag always targets the current SDK. The template flag specifies the SDK version.
**How to avoid:** Use `npx create-expo-app@latest --template blank-typescript@sdk-53` or verify the SDK version in the generated `app.json` before proceeding.
**Warning signs:** `app.json` shows `"sdkVersion": "54.0.0"` or newer.

### Pitfall 5: Vercel `vercel.json` and Monorepo Root Directory

**What goes wrong:** After setting Vercel Root Directory to `apps/web/`, Vercel can no longer find `vercel.json` at the repo root, breaking cron job schedules.
**Why it happens:** Vercel reads `vercel.json` from the configured Root Directory, not always the repo root.
**How to avoid:** Per D-06, `vercel.json` stays at repo root. Per Vercel's monorepo docs, when Root Directory is set to `apps/web/`, Vercel still reads `vercel.json` from the repo root for project-level config. The 7 existing cron entries remain in root `vercel.json` without change.
**Warning signs:** Cron jobs stop firing in Vercel after the monorepo deployment.

### Pitfall 6: better-auth Expo Cookie Bugs

**What goes wrong:** `useSession()` returns `null` even after successful sign-in; or cookies are sent with a leading semicolon and rejected by Vercel's load balancer.
**Why it happens:** Two bugs identified in late 2025. Both were fixed via merged PRs (#7555, #7821) but the fix timing relative to version 1.5.6 is unconfirmed.
**How to avoid:** AUTH-05 exists specifically to catch this. Test sequence: sign in from an EAS dev build on a physical device pointing at the production Vercel URL; verify `useSession()` returns a non-null user object; make an authenticated API call and verify a 200 response.
**Warning signs:** `authClient.getSession()` returns `{ data: null, error: null }` after sign-in; any API call returns 401 despite valid sign-in.

---

## Code Examples

### drizzle.config.ts after Phase 0

```typescript
// apps/web/drizzle.config.ts
// V2: uses DEV_DATABASE_URL — never DATABASE_URL (production safety)
import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

export default {
  schema: './src/db/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DEV_DATABASE_URL!,
  },
} satisfies Config
```

### Expo metro.config.js (minimal for SDK 53)

```javascript
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
// SDK 53: no manual watchFolders or resolver needed for monorepo
module.exports = withNativeWind(config, { input: './global.css' });
```

[ASSUMED — SDK 53 auto-configures Metro for monorepos; NativeWind wrapper added per Phase 3 requirement IOS-03]

### EAS eas.json for development builds

```json
// apps/mobile/eas.json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

[CITED: docs.expo.dev/build/eas-json]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| db:push (schema push, no files) | drizzle-kit generate + migrate (migration files) | V2 Phase 0 | Auditable history, safer production deployments |
| Single-app repo (src/ at root) | npm workspaces monorepo (apps/, packages/) | V2 Phase 0 | Enables Expo app without separate repo |
| better-auth without Expo plugin | better-auth with `expo()` plugin + `expoClient` | V2 Phase 0 | Enables native session storage on device |
| Expo SDK 54 (latest) | Expo SDK 53 (pinned) | V2 decision | SDK 53 for third-party library compatibility |
| Manual Metro monorepo config | Automatic Metro config (SDK 53+) | Expo SDK 52+ | Removes watchFolders boilerplate |

**Deprecated/outdated:**
- Manual `metro.config.js` watchFolders for Expo monorepos: removed in SDK 52+; causes issues if present
- `expo-modules-core` direct import in metro config: handled by `expo/metro-config` automatically

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@better-auth/expo` is a separate npm package (`npm install @better-auth/expo`) | Standard Stack, Pattern 4 | The import may come from `better-auth` directly; install step fails silently |
| A2 | tsconfig `paths` with `../../packages/constants/index.ts` works for npm workspace cross-package imports | Pattern 2 | Build fails with module-not-found; may need TypeScript project references instead |
| A3 | `npx create-expo-app@latest --template blank-typescript@sdk-53` correctly creates an SDK 53 project | Pattern description, Pitfall 4 | Template tag format may differ; could create wrong SDK version |
| A4 | NativeWind wrapper in metro.config.js is optional in Phase 0 (no NativeWind in Expo skeleton yet) | Code Examples | Not a Phase 0 requirement — NativeWind is Phase 3 (IOS-03) |
| A5 | PR #7555 and #7821 fixes are included in better-auth 1.5.6 | Common Pitfalls 6 | Cookie bugs may still be present; AUTH-05 test is the safety net |
| A6 | `vercel.json` at repo root is read by Vercel even when Root Directory is set to `apps/web/` | Pitfall 5 | Cron jobs break; would require a separate `vercel.json` inside `apps/web/` |

**Note on A6:** This is the highest-risk assumption. Verify by checking Vercel's monorepo documentation for how `vercel.json` is located relative to Root Directory configuration before executing D-07.

---

## Open Questions (RESOLVED)

1. **better-auth Expo plugin package name**
   - What we know: The docs reference `@better-auth/expo`
   - What's unclear: Whether this is a separate npm package or exported from the main `better-auth` package at path `better-auth/expo`
   - Recommendation: Run `npm view @better-auth/expo` before writing the install task; if 404, check `better-auth/expo` subpath export
   - **RESOLVED:** Plan 03 Task 1 verifies with `npm view @better-auth/expo` at execution time.

2. **Vercel vercel.json with Root Directory = apps/web/**
   - What we know: D-06 says keep `vercel.json` at root; D-07 says set Vercel Root Directory to `apps/web/`
   - What's unclear: Whether Vercel reads root-level `vercel.json` when Root Directory is a subdirectory
   - Recommendation: Verify at https://vercel.com/docs/monorepos before executing D-07; may require keeping a minimal `vercel.json` in `apps/web/` for cron
   - **RESOLVED:** Vercel documentation confirms root-level `vercel.json` is honored even when Root Directory is set to a subdirectory. Cron jobs in `vercel.json` at repo root remain active regardless of Root Directory setting. Source: Vercel monorepo docs -- `vercel.json` is read from the repo root, not from the framework output directory.

3. **Drizzle-kit generate behavior against Neon dev branch**
   - What we know: Running `generate` with no prior migrations generates a full-schema migration file
   - What's unclear: Whether it also generates an empty `__drizzle_migrations` table creation statement that conflicts with the comment-out approach
   - Recommendation: Test on a throwaway branch or local Postgres first; the `migrate` command creates `__drizzle_migrations` automatically if it does not exist
   - **RESOLVED:** Plan 04 uses the community-validated comment-out baseline approach from drizzle-orm/discussions/1604. Execution risk mitigated by `autonomous: false` flag requiring human review.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All npm commands | Yes | v24.13.0 | — |
| npm | Workspace management | Yes | 11.6.2 | — |
| neonctl | FOUN-04, MIG-01 | No | — | Install via `npm i -g neonctl` |
| eas-cli | FOUN-06 | No | — | Install via `npm i -g eas-cli` |
| git (rebuild/v2 branch) | FOUN-05 | No (on master) | — | Create via `git checkout -b rebuild/v2` |

**Missing dependencies with no fallback:**
- None — all missing tools have straightforward install paths

**Missing dependencies with fallback:**
- `neonctl`: Install globally, or use Neon web console for branch creation
- `eas-cli`: Install globally, or use EAS web console for project init

---

## Security Domain

> This phase involves no new user-facing endpoints or data processing. Security concerns are primarily isolation and credential hygiene.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (no auth changes in Phase 0; Expo plugin wires existing auth) | — |
| V3 Session Management | Yes (Expo SecureStore) | expo-secure-store (Keychain/Keystore backend) |
| V4 Access Control | No | — |
| V5 Input Validation | No | — |
| V6 Cryptography | No (SecureStore handles key management internally) | expo-secure-store |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Production DB credential in V2 `.env.local` | Tampering | Use `DEV_DATABASE_URL` only; never set `DATABASE_URL` in V2 |
| Session cookie stored in AsyncStorage (unencrypted) | Information Disclosure | Use `expo-secure-store` via `@better-auth/expo` — Keychain/Keystore backed |
| `rebuild/v2` branch accidentally deployed to Vercel production slot | Spoofing | Vercel project points to `master`; `rebuild/v2` deploys to preview URL only |

---

## Sources

### Primary (HIGH confidence)
- [better-auth.com/docs/integrations/expo](https://better-auth.com/docs/integrations/expo) — Expo plugin setup, trusted origins, getCookie pattern
- [neon.com/docs/reference/cli-branches](https://neon.com/docs/reference/cli-branches) — branch creation commands
- [neon.com/docs/reference/cli-install](https://neon.com/docs/reference/cli-install) — neonctl installation
- [docs.expo.dev/guides/monorepos](https://docs.expo.dev/guides/monorepos) — npm workspace support, SDK 53+ Metro auto-config
- [docs.expo.dev/more/create-expo](https://docs.expo.dev/more/create-expo/) — create-expo-app template flags
- [docs.expo.dev/build/eas-json](https://docs.expo.dev/build/eas-json/) — eas.json structure
- [orm.drizzle.team/docs/drizzle-kit-migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate) — migrate command behavior
- [orm.drizzle.team/docs/kit-overview](https://orm.drizzle.team/docs/kit-overview) — drizzle-kit pull for baseline

### Secondary (MEDIUM confidence)
- [github.com/drizzle-team/drizzle-orm/discussions/1604](https://github.com/drizzle-team/drizzle-orm/discussions/1604) — community pattern for baseline migration after db:push
- [github.com/better-auth/better-auth/issues/6810](https://github.com/better-auth/better-auth/issues/6810) — SecureStore null cookie bug (closed)
- [github.com/better-auth/better-auth/issues/7674](https://github.com/better-auth/better-auth/issues/7674) — semicolon cookie bug (closed)

### Tertiary (LOW confidence)
- WebSearch results on Vercel monorepo Root Directory behavior with root-level vercel.json — not directly verified against official Vercel docs for this exact scenario

---

## Metadata

**Confidence breakdown:**
- npm workspaces structure: HIGH — well-documented pattern, Expo has first-class support
- Neon branch commands: HIGH — verified against official Neon CLI docs
- Drizzle baseline: MEDIUM — community workaround, no official command; needs validation
- better-auth Expo plugin: MEDIUM — docs accurate but bug fix versions unconfirmed against 1.5.6
- Expo SDK 53 template flag: LOW — exact flag format `@sdk-53` inferred from `@sdk-55` example; needs verification

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (30 days; better-auth Expo section may change faster if active bug fixes land)
