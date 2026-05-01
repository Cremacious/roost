# Phase 0: Foundation - Pattern Map

**Mapped:** 2026-05-01
**Files analyzed:** 12
**Analogs found:** 7 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` (root, new workspace manifest) | config | — | `package.json` (current root) | transform |
| `apps/web/package.json` (moved from root) | config | — | `package.json` (current root) | exact |
| `apps/web/tsconfig.json` (moved + updated) | config | — | `tsconfig.json` (current root) | exact |
| `apps/web/next.config.ts` (moved) | config | — | `next.config.ts` (current root) | exact |
| `apps/web/drizzle.config.ts` (moved + updated) | config | — | `drizzle.config.ts` (current root) | exact |
| `apps/mobile/package.json` (new Expo project) | config | — | `package.json` (current root) | partial (same shape, new deps) |
| `apps/mobile/app.json` (new Expo config) | config | — | none | no analog |
| `packages/api-types/package.json` + `index.ts` | config | — | none (stub) | no analog |
| `packages/constants/package.json` + `index.ts` | config | — | none (stub) | no analog |
| `packages/utils/package.json` + `index.ts` | config | — | none (stub) | no analog |
| `src/lib/auth/helpers.ts` (add `getUserHousehold`) | utility | request-response | `src/lib/auth/helpers.ts` (current file) | exact — add to existing |
| `drizzle/migrations/0000_initial.sql` (first migration) | config | — | none (generated file) | no analog |

---

## Pattern Assignments

### Root `package.json` (new workspace manifest)

**Analog:** Current `package.json` (lines 1-82) — source of all existing script names.

**Key rule:** Root becomes workspace manifest only. All dependencies and devDependencies move to `apps/web/package.json`. Root retains only `workspaces`, `private: true`, and delegate scripts.

**Script names to preserve exactly** (lines 6-21 of current `package.json`):
```json
"dev":          "next dev",
"build":        "next build",
"start":        "next start",
"lint":         "eslint",
"db:generate":  "drizzle-kit generate",
"db:migrate":   "drizzle-kit migrate",
"db:push":      "drizzle-kit push",
"db:seed":      "npx tsx --env-file=.env.local src/db/seed.ts",
"db:studio":    "drizzle-kit studio",
"test":         "jest --config jest.config.js",
"test:watch":   "jest --config jest.config.js --watch",
"test:coverage":"jest --config jest.config.js --coverage",
"test:e2e":     "playwright test",
"test:e2e:ui":  "playwright test --ui",
"test:e2e:headed": "playwright test --headed"
```

**Root manifest pattern** (from RESEARCH.md Pattern 1):
```json
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
    "test:watch":   "npm run test:watch --workspace=apps/web",
    "test:coverage":"npm run test:coverage --workspace=apps/web",
    "test:e2e":     "npm run test:e2e --workspace=apps/web",
    "test:e2e:ui":  "npm run test:e2e:ui --workspace=apps/web",
    "test:e2e:headed": "npm run test:e2e:headed --workspace=apps/web"
  }
}
```

Note: `db:seed` script in `apps/web/package.json` must update the path from `src/db/seed.ts` to remain `src/db/seed.ts` (no change — the path is relative to the script's working directory, which after the move is `apps/web/`).

---

### `apps/web/tsconfig.json` (moved + `@roost/*` paths added)

**Analog:** `tsconfig.json` (current root, lines 1-42) — full contents to copy verbatim, then add `@roost/*` path entries.

**Critical path alias** (lines 25-29 of current `tsconfig.json` — MUST NOT CHANGE):
```json
"paths": {
  "@/*": [
    "./src/*"
  ]
}
```

After move to `apps/web/tsconfig.json`, this string stays identical (`./src/*` is still correct because `tsconfig.json` is now in `apps/web/` and `src/` is `apps/web/src/`).

**Add `@roost/*` paths** (new entries to append to the existing paths block):
```json
"paths": {
  "@/*": ["./src/*"],
  "@roost/constants": ["../../packages/constants/index.ts"],
  "@roost/api-types":  ["../../packages/api-types/index.ts"],
  "@roost/utils":      ["../../packages/utils/index.ts"]
}
```

**Full `include` block** (lines 31-38 of current `tsconfig.json` — copy verbatim):
```json
"include": [
  "next-env.d.ts",
  "**/*.ts",
  "**/*.tsx",
  ".next/types/**/*.ts",
  "**/*.mts",
  ".next/dev/types/**/*.ts"
],
"exclude": ["node_modules"]
```

---

### `apps/web/drizzle.config.ts` (moved + `out` added + credential renamed)

**Analog:** `drizzle.config.ts` (current root, lines 1-12) — copy then apply two changes.

**Current file** (full, lines 1-12):
```typescript
import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

export default {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

**Target state** (two changes: `out` updated, env var renamed):
```typescript
// V2: uses DEV_DATABASE_URL — never DATABASE_URL (production safety)
import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

export default {
  schema: './src/db/schema/index.ts',
  out: './migrations',               // changed from './drizzle'
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DEV_DATABASE_URL!,  // changed from DATABASE_URL
  },
} satisfies Config
```

**Schema path stays identical** — `./src/db/schema/index.ts` is correct both before and after the move because the path is relative to the config file, which moves with `apps/web/`.

---

### `apps/web/next.config.ts` (moved — no content changes)

**Analog:** `next.config.ts` (current root, lines 1-41) — copy verbatim. The relative import `"./src/lib/security/csp"` remains valid because the config moves alongside `src/`.

**Import line to verify** (line 2 of current file):
```typescript
import { buildContentSecurityPolicy } from "./src/lib/security/csp";
```

This import resolves relative to the config file location. After move to `apps/web/next.config.ts`, `./src/lib/security/csp` still resolves to `apps/web/src/lib/security/csp`. No change needed.

---

### `src/lib/auth/helpers.ts` — add `getUserHousehold`

**Analog:** `src/lib/auth/helpers.ts` (current file, lines 1-287) — this is the target file itself. The function is added to the end, following the same export pattern.

**Existing export pattern** (representative, lines 282-286):
```typescript
export function blockChild(member: HouseholdMember): void {
  if (member.role === "child") {
    throw new Response("Forbidden", { status: 403 });
  }
}
```

**`getUserHousehold` source** (from `src/app/api/chores/route.ts`, lines 15-17):
```typescript
export async function getUserHousehold(userId: string) {
  return getUserActiveMembership(userId);
}
```

**New export to append to `src/lib/auth/helpers.ts`:**
```typescript
// Convenience alias used by API routes — exported here so all routes
// import from @/lib/auth/helpers instead of @/app/api/chores/route.
export async function getUserHousehold(userId: string) {
  return getUserActiveMembership(userId);
}
```

`getUserActiveMembership` is already defined and exported from `helpers.ts` (lines 79-107), so no new imports are required.

**Import path change required in 71 caller files:**
- Old: `import { getUserHousehold } from "@/app/api/chores/route"`
- New: `import { getUserHousehold } from "@/lib/auth/helpers"`

**Caller file sample** (from grep, representative):
```typescript
// src/app/api/household/invite/route.ts line 9 (current):
import { getUserHousehold } from "@/app/api/chores/route";

// After refactor:
import { getUserHousehold } from "@/lib/auth/helpers";
```

The full list of 71 files is obtainable via:
```
grep -rl 'getUserHousehold' src/app/api/
```

---

### Stub workspace packages (`packages/api-types`, `packages/constants`, `packages/utils`)

**Analog:** None — new pattern. Use RESEARCH.md Pattern 2 verbatim.

**`package.json` pattern** (identical shape for all three, name differs):
```json
{
  "name": "@roost/constants",
  "version": "0.0.1",
  "private": true,
  "main": "index.ts",
  "types": "index.ts"
}
```

**`index.ts` pattern** (identical for all three, comment differs):
```typescript
// Stub. Real exports extracted from apps/web/src/lib/constants/ in Phase 2.
export {};
```

Apply same shape for `@roost/api-types` (Phase 2: shared request/response types) and `@roost/utils` (Phase 2: DOM-free utilities).

---

### `apps/mobile/package.json` (new Expo skeleton)

**No direct analog.** Created by `npx create-expo-app@latest --template blank-typescript@sdk-53` inside `apps/mobile/`. The generator produces the correct `package.json`.

**Key Phase 0 dependencies to add after scaffold:**
```json
{
  "dependencies": {
    "expo-secure-store": "~14.x",
    "expo-network": "~7.x",
    "better-auth": "^1.5.6"
  }
}
```

Use `npx expo install expo-secure-store expo-network` (not `npm install`) to get SDK-53-compatible versions.

---

### `apps/mobile/app.json` (Expo config)

**No direct analog.** Generated by `create-expo-app`. Key fields to set/verify after generation:

```json
{
  "expo": {
    "name": "Roost",
    "slug": "roost",
    "scheme": "roostapp",
    "sdkVersion": "53.0.0",
    "ios": { "bundleIdentifier": "com.roost.app" },
    "android": { "package": "com.roost.app" },
    "extra": {
      "eas": { "projectId": "<eas-project-id>" }
    }
  }
}
```

`scheme: "roostapp"` must match the `trustedOrigins` entry added to `apps/web/src/lib/auth/index.ts`.

---

### `drizzle/migrations/0000_initial.sql` (first migration baseline)

**No direct analog.** Generated by `drizzle-kit generate --name=initial` against the Neon dev branch. See RESEARCH.md Pattern 3 for the full 6-step baseline procedure.

**Critical content rule:** The generated SQL must be commented out before running `drizzle-kit migrate`. Structure of the file after commenting:

```sql
-- BASELINE: schema already applied via db:push. No DDL needed.
-- This file registers the initial schema in __drizzle_migrations so
-- drizzle-kit treats it as already applied. DO NOT run as plain SQL.
/*
  [all generated CREATE TABLE statements moved inside this block comment]
*/
```

After `drizzle-kit migrate` registers the baseline, the SQL is uncommented again for documentation.

---

## Shared Patterns

### Auth helper export convention
**Source:** `src/lib/auth/helpers.ts`
**Apply to:** `getUserHousehold` addition (FOUN-07)

All helpers in this file follow the same pattern:
- `async function` exported directly (no class wrapper)
- Throws `Response` or `Response.json(...)` for auth failures (not custom error classes)
- WeakMap-based per-request caching for session and membership lookups (lines 30-31)

### Config file dotenv loading
**Source:** `drizzle.config.ts` (lines 2-3)
**Apply to:** `apps/web/drizzle.config.ts`
```typescript
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
```
Both the existing config and the moved config use this pattern — dotenv is a devDependency already in `package.json` (line 71).

### Script naming convention
**Source:** `package.json` (lines 6-21)
**Apply to:** Root `package.json` workspace delegate scripts

All npm scripts use colon-separated namespacing (`db:push`, `test:e2e`, `test:e2e:ui`). This convention must be preserved exactly in the root delegate scripts so `npm run db:push` from the repo root continues to work without retraining.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/mobile/app.json` | config | — | No Expo project exists yet; generated by create-expo-app |
| `apps/mobile/eas.json` | config | — | No EAS config exists; use RESEARCH.md Pattern (eas.json example) |
| `apps/mobile/metro.config.js` | config | — | No Metro config exists; use SDK 53 minimal pattern from RESEARCH.md |
| `packages/*/package.json` + `index.ts` | config | — | Stub packages; use RESEARCH.md Pattern 2 verbatim |
| `drizzle/migrations/0000_initial.sql` | config | — | Generated by drizzle-kit; use RESEARCH.md Pattern 3 procedure |

---

## Metadata

**Analog search scope:** `C:/Code/personal/roost/` (root config files + `src/lib/auth/helpers.ts` + `src/app/api/chores/route.ts`)
**Files scanned:** 6 source files read directly; grep across all `src/app/api/` for caller count
**Pattern extraction date:** 2026-05-01

**Critical implementation notes for planner:**

1. `getUserHousehold` in `src/app/api/chores/route.ts` (lines 15-17) is already a one-line wrapper over `getUserActiveMembership`. Moving it to `helpers.ts` is a pure alias move — zero logic change. The 71 caller files only need their import line updated.

2. The `@/` path alias string `"./src/*"` in `tsconfig.json` does NOT change after the monorepo move. The string is identical before and after; only the file's own location changes, and the relative resolution is still correct.

3. `drizzle.config.ts` currently uses `out: './drizzle'` (line 7). This directory name changes to `'./migrations'` in the moved version. Verify no existing files in `./drizzle/` need to be preserved or migrated.

4. The root `package.json`'s `name` field should change from `"roost"` to `"roost-monorepo"` to reflect that it is the workspace root, not an app package.

5. `apps/web/package.json` is a copy of the current root `package.json` with the `name` field updated to `"@roost/web"` — all 60+ dependencies and devDependencies move there intact.
