# Phase 0: Foundation - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the codebase into a proper monorepo, establish a Neon development branch isolated from production, switch the migration strategy from db:push to drizzle-kit generate + migrate, initialize the Expo project skeleton, and verify better-auth Expo plugin against the production Vercel URL. Everything downstream depends on this foundation being stable and isolated.

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure
- **D-01:** Full move in Phase 0 — ALL existing V1 source code moves to `apps/web/`. No hybrid state. `src/`, `next.config.ts`, `tsconfig.json`, and `package.json` all relocate to `apps/web/`. The repo root becomes the npm workspace manifest only.
- **D-02:** One atomic commit — the entire monorepo restructure (file moves + path updates + config changes) lands in a single commit. No broken intermediate state on the branch.
- **D-03:** Cross-app imports use `@roost/*` workspace packages (e.g., `@roost/constants`, `@roost/api-types`, `@roost/utils`). Each app's `tsconfig.json` includes `paths` entries for these. This is the standard npm workspace pattern.
- **D-04:** Root `package.json` keeps convenience delegate scripts: `"dev": "npm run dev --workspace=apps/web"`, `"build": "npm run build --workspace=apps/web"`, `"db:push": "npm run db:push --workspace=apps/web"`, etc. Developer workflow from root is unchanged.

### Shared Packages
- **D-05:** Stub packages only in Phase 0. `packages/api-types`, `packages/constants`, and `packages/utils` are created as valid npm workspace packages with empty `index.ts` and `package.json` but contain no real implementation. Real extraction from `apps/web/src/lib/` happens in Phase 2 when the Expo app actually imports them. This avoids breaking any V1 feature code in Phase 0.

### Config File Placement
- **D-06:** Split by concern — `vercel.json` stays at repo root (Vercel requirement). `drizzle.config.ts`, `playwright.config.ts`, and `e2e/` move into `apps/web/`. Each config file lives closest to what it configures.

### Vercel Deployment
- **D-07:** Set the Vercel project's Root Directory to `apps/web/` in the Vercel dashboard (one-time manual step). This is the standard Vercel monorepo pattern. No second `vercel.json` inside `apps/web/`.

### Claude's Discretion
- Config file organization within `apps/web/` (e.g., where test utilities and seed scripts land) — follow established conventions from the current layout.
- Exact npm workspace script names at root — match existing names to preserve developer muscle memory.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements and Success Criteria
- `.planning/ROADMAP.md` §"Phase 0: Foundation" — requirements list (FOUN-01..07, AUTH-04, AUTH-05, MIG-01..06), success criteria, and phase goal
- `.planning/REQUIREMENTS.md` — full requirement definitions for FOUN-01 through FOUN-07 and all MIG-* requirements
- `.planning/STATE.md` — confirmed architectural decisions (rebuild/v2 branch, Neon branch, Expo SDK 53, db:push→migrate switch, @gorhom/bottom-sheet v5, Universal Links)

### Current Codebase Structure
- `.planning/codebase/STACK.md` — current technology stack, package versions, path aliases, and build configuration
- `.planning/codebase/STRUCTURE.md` — current file/directory structure that is being reorganized
- `.planning/codebase/CONVENTIONS.md` — established conventions that must be preserved after restructure
- `CLAUDE.md` — implementation rules, current folder structure inventory, V1 files built, migration strategy notes

### Migration and Branch Strategy
- `.planning/PROJECT.md` §"Migration and Cutover Strategy" — rebuild branch approach, data preservation rules, breaking changes to avoid
- `.planning/PROJECT.md` §"Key Decisions" — confirmed decisions table

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth/helpers.ts` — `requireSession`, `requireHouseholdMember`, etc. FOUN-07 requires `getUserHousehold` to move here from `src/app/api/chores/route.ts`. This file is the right home.
- `src/db/schema/index.ts` — re-exports all tables; will become `apps/web/src/db/schema/index.ts`. `drizzle.config.ts` currently points at `./src/db/schema/index.ts` — must update the path after move.
- `src/lib/utils/` — grocery sort, recurrence, debt simplification, time utils are all DOM-free already. These are the primary candidates for eventual `@roost/utils` extraction (Phase 2).
- `src/lib/constants/colors.ts`, `freeTierLimits.ts` — primary candidates for `@roost/constants` (Phase 2). Both have zero DOM dependencies.

### Established Patterns
- Path alias `@/` → `src/` is used throughout all source files. After the move this becomes `@/` → `apps/web/src/` via `apps/web/tsconfig.json`. All existing imports remain unchanged (they use `@/`, not relative paths).
- npm is the package manager; `package-lock.json` is present. Use npm workspaces syntax (`--workspace=`), not pnpm or yarn.
- `drizzle.config.ts` currently at root: `schema: "./src/db/schema/index.ts"`, `dialect: "postgresql"`, no migrations directory. After move: lives in `apps/web/`, schema path updates to `"./src/db/schema/index.ts"` (relative to `apps/web/`), and a `migrations/` directory is added.
- Vercel cron jobs defined in `vercel.json` at repo root — 7 cron entries. Must remain at root after restructure.

### Integration Points
- `apps/mobile/` Expo project calls the same API routes at the production Vercel URL — no shared server code needed in Phase 0.
- `packages/api-types` stub will eventually hold the shared API response/request types that both `apps/web/` API routes and `apps/mobile/` API calls use. For Phase 0 the stub is a placeholder only.
- `@better-auth/expo` plugin integrates with the existing better-auth config at `src/lib/auth/index.ts` (moves to `apps/web/src/lib/auth/index.ts`). The Expo client stores sessions in `expo-secure-store`.

</code_context>

<specifics>
## Specific Ideas

- The Neon dev branch must never reference the production `DATABASE_URL`. A separate `.env.local` (or `.env.development`) for the V2 branch should use a `DEV_DATABASE_URL` or equivalent. This is a safety constraint, not just a convention.
- Expo SDK 53 confirmed (not 54 — third-party library compatibility lag at time of decision). EAS project must specify this in `app.json`.
- The `rebuild/v2` git branch is the development branch. V1 stays live on `master`. No cutover happens until Phase 4.

</specifics>

<deferred>
## Deferred Ideas

- **Migration baseline approach** — how to create the first drizzle-kit migration file against a DB that was built with db:push (no existing migration history). Raised during gray area analysis but not discussed. Researcher should investigate the drizzle-kit `--from` flag and "introspect baseline" pattern. Decision needed before Phase 0 planning.
- **Shared packages extraction (real code)** — moving `colors.ts`, `FREE_TIER_LIMITS`, debt simplification, grocery sort, recurrence, and time utils from `apps/web/src/lib/` into `packages/`. Deferred to Phase 2 when Expo app actually needs them.
- **better-auth Expo cookie issue** — open GitHub issues suggest cookie problems under some server configs. Noted as a blocking open question in STATE.md. Research must cover this before Phase 0 is planned.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 0-Foundation*
*Context gathered: 2026-05-01*
