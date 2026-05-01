# Phase 0: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 0-Foundation
**Areas discussed:** Monorepo migration depth

---

## Monorepo migration depth

### Q1: Move scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full move — everything to apps/web/ | src/, next.config.ts, package.json, tsconfig.json all relocate. Clean end state but requires updating every path alias and config. | ✓ |
| Structural only — new dirs alongside V1 src/ | Create apps/web/, apps/mobile/, packages/ at root while leaving V1's src/ in place. Defer actual code move to Phase 1. | |
| Incremental — move but keep root package.json as workspace root | Root package.json becomes workspace manifest only; src/ moves to apps/web/src/. Standard monorepo pattern. | |

**User's choice:** Full move — everything to apps/web/ (Recommended)

---

### Q2: Cross-app import resolution

| Option | Description | Selected |
|--------|-------------|----------|
| @roost/* workspace packages | packages/constants → @roost/constants, importable from both apps. Standard npm workspace pattern with tsconfig paths. | ✓ |
| Relative paths only | No package aliases — both apps import via relative paths. Works but verbose. | |
| Single tsconfig path alias per app | Each app keeps its own @/ alias; shared packages use @pkg/. | |

**User's choice:** @roost/* workspace packages (Recommended)

---

### Q3: Config file placement

| Option | Description | Selected |
|--------|-------------|----------|
| Stay at root | vercel.json, drizzle.config.ts, e2e/ all stay at root. | |
| Move into apps/web/ | All web-specific configs move to apps/web/. | |
| Split by concern | vercel.json stays root (Vercel requirement); drizzle.config.ts + e2e/ move to apps/web/. | ✓ (Claude's discretion) |

**User's choice:** "whatever is best" — deferred to Claude.
**Notes:** Split by concern selected as Claude's discretion: vercel.json stays at root, drizzle.config.ts and e2e/ move to apps/web/.

---

### Q4: Vercel deployment pointing

| Option | Description | Selected |
|--------|-------------|----------|
| Set Root Directory to apps/web/ in Vercel dashboard | Standard Vercel monorepo pattern. One-time manual setting. | ✓ |
| Add vercel.json with builds config inside apps/web/ | Second vercel.json inside apps/web/. Can conflict with root vercel.json. | |
| Leave deploy config as-is for Phase 0 | Don't touch Vercel during Phase 0; separate Vercel project for V2 when ready. | |

**User's choice:** Set Root Directory to apps/web/ in Vercel dashboard (Recommended)

---

### Q5: Commit strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One atomic commit | All file moves, path updates, and config changes in a single commit. Clean git history, never broken. | ✓ |
| Incremental — structure, then move, then update imports | Easier to bisect but branch is broken between commits 2 and 3. | |

**User's choice:** One atomic commit (Recommended)

---

### Q6: Shared packages scope

| Option | Description | Selected |
|--------|-------------|----------|
| Stub packages now, extract later | Phase 0 creates @roost/* as valid workspace packages with empty index.ts. Real extraction in Phase 2. | ✓ |
| Full extraction in Phase 0 | colors.ts, FREE_TIER_LIMITS, utils all move to packages/ now. Risk: breaking V1 imports. | |

**User's choice:** Stub packages now, extract later (Recommended)

---

### Q7: Root scripts

| Option | Description | Selected |
|--------|-------------|----------|
| Root delegates to workspaces | Root package.json keeps convenience scripts that delegate to apps/web. Developer workflow unchanged. | ✓ |
| Only in individual app package.json | No delegate scripts at root. Developer must cd into apps/web/. | |
| Turborepo pipeline | Add Turborepo for cross-workspace builds. Overkill for solo dev. | |

**User's choice:** Root delegates to workspaces (Recommended)

---

## Claude's Discretion

- Config file placement (Q3): split by concern — vercel.json at root, drizzle.config.ts + e2e/ in apps/web/
- Exact root script names: match existing names to preserve developer muscle memory
- File organization within apps/web/ (test utilities, seed scripts): follow established conventions from current layout

## Deferred Ideas

- Migration baseline approach (how to create first drizzle-kit migration against a db:push-only DB) — raised during gray area analysis, not discussed. Needs researcher investigation.
- Shared packages real extraction (colors.ts, FREE_TIER_LIMITS, utils) — deferred to Phase 2 when Expo app needs them.
- better-auth Expo cookie issue — STATE.md open question; researcher must cover before Phase 0 planning.
