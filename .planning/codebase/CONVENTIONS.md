# Coding Conventions

**Analysis Date:** 2026-05-01

## Naming Patterns

**Files:**
- React components: PascalCase, `.tsx` (e.g. `SlabCard.tsx`, `MemberAvatar.tsx`, `EmptyState.tsx`)
- Hooks: camelCase prefixed with `use`, `.ts` (e.g. `useHousehold.ts`, `useUserPreferences.ts`)
- Utility functions: camelCase, `.ts` (e.g. `activity.ts`, `grocerySort.ts`, `time.ts`)
- API route handlers: `route.ts` inside `app/api/` directory segments
- DB schema files: lowercase snake_case, `.ts` (e.g. `chores.ts`, `household_members.ts`)
- Constants files: camelCase (e.g. `colors.ts`, `themes.ts`, `freeTierLimits.ts`)
- Spec/test files: `*.spec.ts` for E2E, `*.test.ts` / `*.test.tsx` for unit tests
- E2E helpers: camelCase inside `e2e/helpers/` directory

**Functions and Variables:**
- Functions: camelCase (e.g. `getUserHousehold`, `calcNextDueAt`, `logActivity`, `classifyItem`)
- Helper exports from route files: named exports alongside HTTP handlers (e.g. `getUserHousehold` exported from `src/app/api/chores/route.ts`)
- React component props interfaces: PascalCase with `Props` suffix (e.g. `SlabCardProps`, `EmptyStateProps`, `MemberAvatarProps`)
- Constants: SCREAMING_SNAKE_CASE for top-level const maps (e.g. `SECTION_COLORS`, `FREE_TIER_LIMITS`, `STORE_SECTIONS`, `CHORE_ICON_MAP`)
- DB table variables: snake_case matching the DB column names (e.g. `household_id`, `created_at`, `deleted_at`)
- Type aliases: PascalCase (e.g. `SectionKey`, `StoreSection`, `AuthSession`, `ThemeKey`)

**Drizzle Schema:**
- Table identifiers exported as snake_case (e.g. `chore_completions`, `household_members`)
- Column names use snake_case matching the DB column (e.g. `household_id`, `next_due_at`)
- Each table file groups related tables together (e.g. `chores.ts` contains `chores`, `chore_completions`, `chore_streaks`)

## Code Style

**Formatting:**
- No Prettier config detected; formatting enforced via ESLint only
- Single quotes for string literals in most contexts
- Template literals used for dynamic strings
- Trailing commas on multiline arrays/objects (TypeScript default)
- No semicolons are not explicitly configured — standard TypeScript style

**Linting:**
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `playwright-report/`, `test-results/`, `coverage/`
- No custom rule overrides — relies entirely on Next.js/TypeScript defaults
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)

**TypeScript:**
- Strict mode on; `noEmit: true`; target ES2017
- `moduleResolution: "bundler"` for Next.js App Router compatibility
- Path alias `@/*` maps to `./src/*` — always use this for internal imports

## Import Organization

**Order:**
1. Next.js / React framework imports (`"use client"` directive at top when needed)
2. Third-party libraries (`next/server`, `@tanstack/react-query`, `lucide-react`, `framer-motion`, `sonner`)
3. Internal `@/` aliased imports — lib/utils, lib/hooks, lib/constants first, then components, then db/schema

**Path Aliases:**
- `@/lib/auth/helpers` — auth session helpers
- `@/lib/db` — Neon + Drizzle instance
- `@/db/schema` — all DB tables (re-exported via `src/db/schema/index.ts`)
- `@/lib/constants/colors` — section colors (NEVER hardcode hex values; always import)
- `@/lib/constants/themes` — theme definitions
- `@/lib/utils/*` — shared utility functions
- `@/lib/hooks/*` — shared React hooks
- `@/components/shared/*` — reusable UI components
- `@/components/ui/*` — shadcn primitives

**Directive placement:**
- `"use client"` placed as the very first line of the file, before any imports

## Error Handling

**API Route Pattern:**
```typescript
// Session auth: throw pattern; route catches and returns
let session;
try {
  session = await requireSession(request);
} catch (r) {
  return r as Response;
}

// Body parsing: separate try/catch returns 400
let body: { ... };
try {
  body = await request.json();
} catch {
  return Response.json({ error: "Invalid request body" }, { status: 400 });
}
```

**Premium/Role Errors:**
```typescript
// Always return structured error with `code` field for client-side gate handling
return Response.json(
  { error: "Free tier limit reached", code: "CHORES_LIMIT", limit: FREE_TIER_LIMITS.chores, current: count },
  { status: 403 }
);
```

**Client Mutation Errors:**
```typescript
// Propagate error code for upgrade gate
const err = new Error(msg) as Error & { code?: string };
err.code = data.code;
throw err;
// Sheet onError: if (err.code && onUpgradeRequired) { onUpgradeRequired(err.code); return; }
```

**Silent Failures:**
- Activity logging (`logActivity()`) swallows all errors silently — never let non-critical side effects break the main flow
- Theme API calls in `useTheme()` catch silently — visual state already applied

**Non-2xx status patterns:**
- `401` — no session (unauthenticated)
- `403` — insufficient role, child block, or premium gate (with `code` field)
- `400` — invalid input, missing required fields
- `404` — resource not found (household, chore, etc.)
- `201` — successful creation
- `200` — successful read/update

## Toasts

- Use `sonner` only. Import: `import { toast } from "sonner"` in client components
- Never use `@/components/ui/toast`
- `toast.error()` must always include a `description` field — never a bare title
- `toast.success()` for confirmations (e.g. "Theme updated")
- `richColors: false` — styles controlled via `.roost-toast-*` CSS classes in `globals.css`

## Logging

**Server:**
- `console.error` for unexpected failures in API routes
- No structured logging library
- Activity logging via `logActivity()` helper (`src/lib/utils/activity.ts`) — fire-and-forget

**Client:**
- No logging in production client code
- `console.log` only in test/dev tooling and E2E global-setup

## Comments

**When to Comment:**
- Block separators in route files use `// ---- Section name ----` pattern (e.g. `// ---- GET ----`, `// ---- POST ----`, `// ---- Shared helpers ----`)
- Inline `//` comments for non-obvious business logic (e.g. guest expiry check, streak partition key)
- JSDoc not used — TypeScript types serve as documentation
- Test files: describe block comments explain fixture strategy and test scope

**No-op catches:**
```typescript
} catch {
  // Activity logging must never break the main flow
}
```

## Function Design

**Size:** Route handlers are long (~200 lines) but structured with section comments. Utility functions are small and single-purpose (e.g. `relativeTime`, `calcNextDueAt`, `classifyItem`).

**Parameters:** Prefer object destructuring for props; positional args for small utilities with 1-3 params.

**Default parameters:** Used for optional args (e.g. `from: Date = new Date()` in `calcNextDueAt`).

**Return Values:**
- API routes always return `Response.json(...)` — never throw from route handlers
- Utility functions return typed values; `null` for not-found rather than `undefined`
- Hooks return stable object shapes (e.g. `useHousehold()` always returns all keys even when loading)

## Component Design

**"use client" directive:**
- Required on any component that uses hooks, event handlers, or browser APIs
- Server components (no directive) used for layouts and pages that only need DB data
- Never add `"use client"` to utility files in `src/lib/`

**Props pattern:**
- Interface defined immediately before the component function
- Optional props use `?` and include defaults in destructuring
- Color props always accept CSS variable strings or hex values (e.g. `color?: string`)

**Inline styles vs Tailwind:**
- Theme colors: always inline `style={{ color: "var(--roost-text-primary)" }}` — never Tailwind color classes
- Section colors: inline style with imported constant from `src/lib/constants/colors.ts`
- Layout/spacing: Tailwind classes
- Interactive states (pressed, hover): inline style via `useState` + `onPointerDown/Up/Leave`

**Touch targets:**
- Minimum 48px for all interactive elements
- 64px for list row items (e.g. `min-h-16` on grocery item rows)
- Never use `h-8` or `h-6` for tappable buttons

**No emojis:** All icons from `lucide-react` only.

**No em dashes:** Never use `—` or `--` in UI-facing text, placeholders, or JSX string content.

**framer-motion animations:**
- Page wrapper: `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}` duration 0.18
- List stagger: `delay: Math.min(index * 0.04, 0.2)`, duration 0.15
- Buttons: `whileTap={{ y: 2 }}` (cards/FAB) or `{{ y: 1 }}` (small buttons)

## Module Design

**Exports:**
- Default export for React components
- Named exports for utilities, hooks, and constants
- Helper functions co-located in route files exported alongside HTTP handlers (e.g. `getUserHousehold`, `calcNextDueAt` from `src/app/api/chores/route.ts`)

**Barrel Files:**
- `src/db/schema/index.ts` re-exports all DB tables
- No barrel files for components or utilities — import directly from the file

## CSS Variable Convention

Always use these CSS variables for theme-aware colors. Never hardcode backgrounds or text colors on components:

| Variable | Use |
|---|---|
| `var(--roost-bg)` | Page background |
| `var(--roost-surface)` | Card/panel background |
| `var(--roost-border)` | Top/left/right border on cards |
| `var(--roost-border-bottom)` | Neutral 4px slab bottom border |
| `var(--roost-text-primary)` | Primary text |
| `var(--roost-text-secondary)` | Secondary text |
| `var(--roost-text-muted)` | Timestamps, captions, helper labels ONLY |
| `var(--roost-topbar-bg)` | TopBar background (desktop) |
| `var(--roost-sidebar-bg)` | Sidebar background |

**Sidebar exception:** The sidebar background is hardcoded `#DC2626`. All sidebar text/icons use `white` / `rgba(255,255,255,X)` — never CSS variables inside the sidebar.

## Data Access Patterns

**Premium check in routes:**
```typescript
const [household] = await db
  .select({ subscription_status: households.subscription_status })
  .from(households)
  .where(eq(households.id, membership.householdId))
  .limit(1);
const isPremium = household?.subscription_status === "premium";
```

**Soft deletes:** Filter with `isNull(table.deleted_at)` in all queries. Never hard-delete user data except for explicit admin operations.

**Optimistic UI (TanStack Query):**
```
cancelQueries -> setQueryData (optimistic) -> API call
  onError: revert via setQueryData(previousData)
  onSettled: invalidateQueries
```

**Client-side premium gate:**
- Always use `useHousehold().isPremium` — never derive from individual API responses
- Import from `src/lib/hooks/useHousehold.ts`

---

*Convention analysis: 2026-05-01*
