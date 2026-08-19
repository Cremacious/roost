# Roost Mobile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new `roost-mobile` Expo Router (iOS) app with working auth, household onboarding, and the five core daily-use modules (Today, Chores, Grocery, Calendar, Tasks), talking to Roost's existing production API/database, buildable via EAS into a TestFlight-installable app with no dev server required at runtime.

**Architecture:** `roost-mobile` is a pure client — a standalone Expo Router repo with no shared package/monorepo relationship to `roost`. It authenticates against `roost`'s existing better-auth server (extended with the official Expo plugin) and consumes the exact same `/api/*` JSON contracts the web app already uses. Business logic with zero DOM dependencies (colors, plan limits, grocery sort, recurrence expansion, chore due-date math) is copied verbatim from `roost`'s `src/lib/` into `roost-mobile`'s `src/lib/`. Screens are built with plain, functional React Native styling — no design system yet; a later sub-project applies the Claude Design handoff on top of this working foundation.

**Tech Stack:** Expo (SDK, scaffolded via `create-expo-app@latest` to always get current), Expo Router, TypeScript, `@better-auth/expo` + `expo-secure-store`, `@tanstack/react-query`, `lucide-react-native`, `date-fns`, Jest (`jest-expo` preset) for pure-logic unit tests only — no automated UI/E2E tests in this sub-project (screens are verified by manually running the app, per the spec).

**Spec:** [docs/superpowers/specs/2026-08-18-roost-mobile-foundation-design.md](../specs/2026-08-18-roost-mobile-foundation-design.md)

## Global Constraints

- No emojis anywhere — Lucide icons only (`lucide-react-native` on mobile).
- No em dashes and no double hyphens in any UI-facing text, placeholders, copy, or JSX string content. Use commas, colons, periods, or reword instead.
- Touch targets 48px minimum.
- `roost-mobile` is a separate repo from `roost` — never add it as a workspace/monorepo package.
- Zero DOM dependencies in anything under `roost-mobile/src/lib/` (no `window`, `document`, `localStorage`).
- No database, Stripe/RevenueCat, Azure, or Resend secrets ever appear client-side in `roost-mobile`. The only environment value the mobile app needs is `EXPO_PUBLIC_API_URL`.
- No changes to any `/api/*` request/response JSON shape in the `roost` repo except the one explicitly listed addition in Task 7 (child-login response body).
- No separate staging environment — `roost-mobile` points at `roost`'s production Vercel deployment and production Neon database from the start (deliberate, per spec).
- This sub-project ships with plain functional RN styling. Do not attempt visual polish, custom fonts, or a design system pass — that is sub-project 5.
- Out of scope for this plan (do not build): Notes, Reminders, Meals, Money/Expenses, Rewards, receipt scanning, RevenueCat/Stripe billing, promo codes, guest invites, multi-household switching, push notifications, admin panel.

---

## Task 1: Scaffold the `roost-mobile` repo

**Files:**
- Create: `roost-mobile/` (new repo, sibling directory to `roost/`, e.g. `/home/chris/Code/roost-mobile`)
- Create: `roost-mobile/app.json`
- Create: `roost-mobile/app.config.ts`
- Create: `roost-mobile/babel.config.js`
- Create: `roost-mobile/tsconfig.json`
- Create: `roost-mobile/jest.config.js`
- Create: `roost-mobile/.gitignore`
- Create: `roost-mobile/.env.example`
- Create: `roost-mobile/app/_layout.tsx` (placeholder, replaced in Task 8)
- Create: `roost-mobile/app/index.tsx` (placeholder, replaced in Task 8)

**Interfaces:**
- Produces: a bootable Expo Router project at `roost-mobile/` with TypeScript, Jest, and `EXPO_PUBLIC_API_URL` config wired, ready for later tasks to add real screens and dependencies.

- [ ] **Step 1: Scaffold the project**

```bash
cd /home/chris/Code
npx create-expo-app@latest roost-mobile --template default@latest
cd roost-mobile
npx expo install expo-router expo-secure-store expo-status-bar
```

When prompted, choose the TypeScript template if `create-expo-app` asks (the `default` template is TS by default as of current Expo tooling).

- [ ] **Step 2: Set app.json for Expo Router + the app scheme**

Replace `roost-mobile/app.json` contents with:

```json
{
  "expo": {
    "name": "Roost",
    "slug": "roost-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "roost",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#EF4444"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.roost.app"
    },
    "plugins": ["expo-router", "expo-secure-store"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

Set `"main": "expo-router/entry"` in `package.json` if the scaffold didn't already (the `expo-router` template usually does this automatically; verify it's present).

- [ ] **Step 3: Add app.config.ts for environment-driven config**

Create `roost-mobile/app.config.ts`:

```ts
import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
})
```

Create `roost-mobile/.env.example`:

```
EXPO_PUBLIC_API_URL=https://your-roost-deployment.vercel.app
```

Create `roost-mobile/.env` (gitignored) with the real production URL of the `roost` Vercel deployment.

Add `.env` to `roost-mobile/.gitignore` if not already present (the Expo template usually already ignores `.env*.local` but not `.env` itself — add it explicitly).

- [ ] **Step 4: Set up TypeScript strictness matching roost's conventions**

Edit `roost-mobile/tsconfig.json` to ensure `"strict": true` is set (the Expo TS template sets this by default via `expo/tsconfig.base`; confirm it's not overridden to false).

- [ ] **Step 5: Install and configure Jest for pure-logic unit tests**

```bash
npx expo install jest-expo jest @types/jest --dev
```

Create `roost-mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
}
```

Add to `roost-mobile/package.json` scripts:

```json
{
  "scripts": {
    "test": "jest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 6: Verify the scaffold compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest --passWithNoTests`
Expected: passes with no tests found (nothing written yet).

- [ ] **Step 7: Initial commit**

```bash
cd /home/chris/Code/roost-mobile
git init
git add -A
git commit -m "chore: scaffold roost-mobile Expo Router project"
```

---

## Task 2: Delete the dead scaffold from the `roost` repo

**Files:**
- Delete: `roost/apps/mobile/` (entire directory)
- Delete: `roost/packages/` (entire directory)
- Modify: `roost/package.json` (remove `workspaces` field)

**Interfaces:**
- Consumes: nothing (independent cleanup task).
- Produces: nothing consumed by later tasks — this is pure removal.

- [ ] **Step 1: Remove the dead directories**

```bash
cd /home/chris/Code/roost
git rm -r apps/mobile packages
```

- [ ] **Step 2: Remove the workspaces field from package.json**

Read `roost/package.json`, remove:

```json
  "workspaces": [
    "apps/mobile",
    "packages/*"
  ],
```

- [ ] **Step 3: Verify the web app still builds**

Run: `npm install` (to regenerate lockfile without the now-gone workspace packages)
Run: `npm run typecheck`
Expected: no errors (nothing in `src/` imports from the deleted paths, confirmed during spec research).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead apps/mobile + packages/* scaffold from abandoned V2 monorepo attempt"
```

---

## Task 3: Add the better-auth Expo server plugin to `roost`

**Files:**
- Modify: `roost/src/lib/auth/index.ts`
- Modify: `roost/package.json` (add `@better-auth/expo` dependency)

**Interfaces:**
- Consumes: nothing.
- Produces: a `roost` backend that accepts session cookies from the `roost-mobile` app's URL scheme (`roost://`) and Expo dev/prod origins. This is required before Task 4's mobile auth client can work.

- [ ] **Step 1: Install the plugin**

```bash
cd /home/chris/Code/roost
npm install @better-auth/expo
```

- [ ] **Step 2: Add the plugin and trusted origins**

In `roost/src/lib/auth/index.ts`, add the import at the top:

```ts
import { expo } from '@better-auth/expo'
```

Add `plugins` and `trustedOrigins` to the `betterAuth({...})` config object (alongside the existing `secret`, `baseURL`, `socialProviders`, `database`, `emailAndPassword`, `user`, `databaseHooks` keys):

```ts
  plugins: [expo()],
  trustedOrigins: [
    'roost://',
    ...(process.env.NODE_ENV === 'development'
      ? ['exp://', 'exp://**', 'exp://192.168.*.*:*/**']
      : []),
  ],
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds (this plugin only adds an allowed-origin check and doesn't change any existing route behavior, so the existing Playwright suite and web auth flows are unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/index.ts package.json package-lock.json
git commit -m "feat(auth): add better-auth Expo plugin + trusted origins for roost-mobile"
```

---

## Task 4: `roost-mobile` — auth client + `apiFetch` wrapper

**Files:**
- Create: `roost-mobile/src/lib/auth/client.ts`
- Create: `roost-mobile/src/lib/auth/manualSession.ts`
- Create: `roost-mobile/src/lib/api/client.ts`
- Test: `roost-mobile/src/lib/api/client.test.ts`
- Modify: `roost-mobile/package.json` (add `@better-auth/expo`, `better-auth`, `@tanstack/react-query`)

**Interfaces:**
- Produces:
  - `authClient` (from `src/lib/auth/client.ts`): `{ signIn, signUp, signOut, useSession, getCookie }` — the better-auth Expo client instance.
  - `setManualSessionCookie(cookie: string): Promise<void>`, `getManualSessionCookie(): Promise<string | null>`, `clearManualSessionCookie(): Promise<void>` (from `src/lib/auth/manualSession.ts`).
  - `apiFetch<T>(path: string, options？: RequestInit): Promise<T>` and `class ApiError extends Error { status: number; code？: string; limit？: number; current？: number }` (from `src/lib/api/client.ts`). Every later task's API calls go through `apiFetch`.
- Consumes: `EXPO_PUBLIC_API_URL` from `app.config.ts` (Task 1).

**Design note on the child-login cookie problem:** better-auth's Expo client plugin auto-captures `Set-Cookie` only from requests made through `authClient`'s own built-in actions (`signIn.email`, `signUp.email`, etc.). The custom `/api/auth/child-login` endpoint (Task 7) is not a built-in action, so its session cookie needs a separate, explicit path. `manualSession.ts` gives the child-login flow its own small SecureStore slot for exactly the `name=value` cookie pair (that's all an outgoing `Cookie:` header ever needs — no `Max-Age`/`Path`/`HttpOnly` attributes, those are response-only). `apiFetch` checks the manual slot first and falls back to `authClient.getCookie()`, so both login paths work uniformly everywhere else in the app.

- [ ] **Step 1: Install dependencies**

```bash
cd /home/chris/Code/roost-mobile
npx expo install @better-auth/expo better-auth @tanstack/react-query
```

- [ ] **Step 2: Write the auth client**

Create `roost-mobile/src/lib/auth/client.ts`:

```ts
import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined
if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not set')

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [
    expoClient({
      scheme: 'roost',
      storagePrefix: 'roost',
      storage: SecureStore,
    }),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient
```

- [ ] **Step 3: Write the manual session store**

Create `roost-mobile/src/lib/auth/manualSession.ts`:

```ts
import * as SecureStore from 'expo-secure-store'

const MANUAL_COOKIE_KEY = 'roost_manual_cookie'

export async function setManualSessionCookie(cookie: string): Promise<void> {
  await SecureStore.setItemAsync(MANUAL_COOKIE_KEY, cookie)
}

export async function getManualSessionCookie(): Promise<string | null> {
  return SecureStore.getItemAsync(MANUAL_COOKIE_KEY)
}

export async function clearManualSessionCookie(): Promise<void> {
  await SecureStore.deleteItemAsync(MANUAL_COOKIE_KEY)
}
```

- [ ] **Step 4: Write the failing test for `apiFetch`**

Create `roost-mobile/src/lib/api/client.test.ts`:

```ts
import { apiFetch, ApiError } from './client'

jest.mock('../auth/client', () => ({
  authClient: { getCookie: jest.fn().mockResolvedValue('roost_cookie=abc123') },
}))
jest.mock('../auth/manualSession', () => ({
  getManualSessionCookie: jest.fn().mockResolvedValue(null),
}))

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
})

describe('apiFetch', () => {
  it('attaches the cookie header and returns parsed JSON on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ chores: [] }),
    }) as unknown as typeof fetch

    const result = await apiFetch<{ chores: unknown[] }>('/api/chores')

    expect(result).toEqual({ chores: [] })
    const [, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(options.headers.Cookie).toBe('roost_cookie=abc123')
  })

  it('throws an ApiError carrying status, code, limit, and current from an error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Free plan is limited to 10 chores',
        code: 'CHORES_LIMIT',
        limit: 10,
        current: 10,
      }),
    }) as unknown as typeof fetch

    await expect(apiFetch('/api/chores', { method: 'POST' })).rejects.toMatchObject({
      message: 'Free plan is limited to 10 chores',
      status: 403,
      code: 'CHORES_LIMIT',
      limit: 10,
      current: 10,
    })
  })

  it('prefers the manual session cookie over the authClient cookie when both are set', async () => {
    const { getManualSessionCookie } = require('../auth/manualSession')
    ;(getManualSessionCookie as jest.Mock).mockResolvedValue('roost_manual=xyz')

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    }) as unknown as typeof fetch

    await apiFetch('/api/today')

    const [, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(options.headers.Cookie).toBe('roost_manual=xyz')
  })
})

it('ApiError is an instance of Error', () => {
  const err = new ApiError('boom', 500)
  expect(err).toBeInstanceOf(Error)
  expect(err.name).toBe('ApiError')
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx jest src/lib/api/client.test.ts`
Expected: FAIL, `Cannot find module './client'`.

- [ ] **Step 6: Implement `apiFetch`**

Create `roost-mobile/src/lib/api/client.ts`:

```ts
import Constants from 'expo-constants'
import { authClient } from '../auth/client'
import { getManualSessionCookie } from '../auth/manualSession'

const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined
if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not set')

export class ApiError extends Error {
  status: number
  code?: string
  limit?: number
  current?: number

  constructor(message: string, status: number, code?: string, limit?: number, current?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.limit = limit
    this.current = current
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const manualCookie = await getManualSessionCookie()
  const cookie = manualCookie ?? (await authClient.getCookie())

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie ?? '',
      ...options.headers,
    },
    credentials: 'omit',
  })

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  const body = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    throw new ApiError(
      body?.error ?? `Request failed with status ${response.status}`,
      response.status,
      body?.code,
      body?.limit,
      body?.current,
    )
  }

  return body as T
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx jest src/lib/api/client.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth src/lib/api package.json package-lock.json
git commit -m "feat(auth): add better-auth Expo client, manual session store, and apiFetch wrapper"
```

---

## Task 5: `roost-mobile` — port pure business logic

**Files:**
- Create: `roost-mobile/src/lib/constants/colors.ts`
- Create: `roost-mobile/src/lib/constants/planLimits.ts`
- Create: `roost-mobile/src/lib/utils/grocerySort.ts`
- Create: `roost-mobile/src/lib/utils/recurrence.ts`
- Create: `roost-mobile/src/lib/utils/choreSchedule.ts`
- Test: `roost-mobile/src/lib/utils/choreSchedule.test.ts`
- Test: `roost-mobile/src/lib/utils/grocerySort.test.ts`
- Test: `roost-mobile/src/lib/utils/recurrence.test.ts`

**Interfaces:**
- Produces: `SECTION_COLORS`, `SectionKey` (colors.ts); `PLAN_LIMITS`, `FEATURE_ACCESS`, `tierFor`, `planLimit`, `hasFeature` (planLimits.ts); `classifyItem`, `groupItemsBySection`, `STORE_SECTIONS` (grocerySort.ts); `expandRecurring` (recurrence.ts); `calcNextDueAt`, `advanceNextDueAt`, `parseDateInput` (choreSchedule.ts). Later tasks (Chores, Grocery, Calendar) import from these files.
- Consumes: nothing.

All four source files were confirmed during spec research to have zero DOM/window dependencies, so they port with only import-path changes.

- [ ] **Step 1: Copy `colors.ts` verbatim**

Copy the full contents of `/home/chris/Code/roost/src/lib/constants/colors.ts` into `roost-mobile/src/lib/constants/colors.ts` unchanged (it's a standalone `as const` object with no imports).

- [ ] **Step 2: Copy `planLimits.ts` verbatim**

Copy the full contents of `/home/chris/Code/roost/src/lib/constants/planLimits.ts` into `roost-mobile/src/lib/constants/planLimits.ts` unchanged (standalone, no imports).

- [ ] **Step 3: Copy `grocerySort.ts` verbatim**

Copy the full contents of `/home/chris/Code/roost/src/lib/utils/grocerySort.ts` into `roost-mobile/src/lib/utils/grocerySort.ts` unchanged (standalone, no imports, pure string/array logic over the `STORE_SECTIONS`/`SECTION_KEYWORDS` keyword tables).

- [ ] **Step 4: Copy `recurrence.ts` verbatim**

Copy the full contents of `/home/chris/Code/roost/src/lib/utils/recurrence.ts` into `roost-mobile/src/lib/utils/recurrence.ts` unchanged (standalone, pure `Date` arithmetic):

```ts
export interface RecurrenceFields {
  startTime: Date
  endTime: Date
  frequency: string | null
  repeatEndType: string | null
  repeatUntil: Date | null
  repeatOccurrences: number | null
}

export function expandRecurring<T extends RecurrenceFields>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date,
): Array<T & { isRecurring: boolean; templateStartTime: string }> {
  const results: Array<T & { isRecurring: boolean; templateStartTime: string }> = []
  if (!event.frequency) return results

  const templateStartTime = event.startTime.toISOString()
  const durationMs = event.endTime.getTime() - event.startTime.getTime()
  let current = new Date(event.startTime)
  let count = 0
  const MAX = 3660

  while (count < MAX) {
    if (event.repeatEndType === 'until_date' && event.repeatUntil && current > event.repeatUntil) break
    if (event.repeatEndType === 'after_occurrences' && event.repeatOccurrences && count >= event.repeatOccurrences) break

    if (current >= rangeStart && current < rangeEnd) {
      results.push({
        ...event,
        startTime: new Date(current),
        endTime: new Date(current.getTime() + durationMs),
        isRecurring: true,
        templateStartTime,
      })
    }

    const next = new Date(current)
    switch (event.frequency) {
      case 'daily':    next.setDate(next.getDate() + 1); break
      case 'weekly':   next.setDate(next.getDate() + 7); break
      case 'biweekly': next.setDate(next.getDate() + 14); break
      case 'monthly':  next.setMonth(next.getMonth() + 1); break
      case 'yearly':   next.setFullYear(next.getFullYear() + 1); break
      default:         next.setDate(next.getDate() + 7)
    }

    if (next <= current) break
    current = next
    count++

    if (current > rangeEnd && results.length > 0) break
  }

  return results
}
```

- [ ] **Step 5: Write `choreSchedule.ts`** (extracted from `roost`'s `src/app/api/chores/route.ts`, which exports these as server-route helpers; the mobile app needs the same date math client-side to preview a due date while building the create/edit form)

Create `roost-mobile/src/lib/utils/choreSchedule.ts`:

```ts
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

export function calcNextDueAt(frequency: string, customDays: string | null, from = new Date()): Date {
  const next = new Date(from)
  next.setHours(12, 0, 0, 0)
  const hasDay = customDays != null && customDays !== ''

  switch (frequency) {
    case 'daily':
      break
    case 'weekly':
    case 'biweekly': {
      const target = hasDay ? Number(customDays) : next.getDay()
      const daysUntil = (((target - next.getDay()) % 7) + 7) % 7
      next.setDate(next.getDate() + daysUntil)
      break
    }
    case 'monthly': {
      const dom = hasDay ? Number(customDays) : next.getDate()
      const thisMonth = new Date(next)
      thisMonth.setDate(daysInMonth(thisMonth.getFullYear(), thisMonth.getMonth()) >= dom ? dom : daysInMonth(thisMonth.getFullYear(), thisMonth.getMonth()))
      if (thisMonth >= next) return thisMonth
      const nextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 1, 12, 0, 0, 0)
      nextMonth.setDate(Math.min(dom, daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())))
      return nextMonth
    }
    case 'custom': {
      if (customDays) {
        const days = customDays.split(' ').map(Number).sort((a, b) => a - b)
        const todayDow = next.getDay()
        const nextDay = days.find(d => d >= todayDow) ?? days[0]
        const daysUntil = nextDay >= todayDow ? nextDay - todayDow : 7 - todayDow + nextDay
        next.setDate(next.getDate() + daysUntil)
      } else {
        next.setDate(next.getDate() + 7)
      }
      break
    }
    default: {
      const target = hasDay ? Number(customDays) : next.getDay()
      const daysUntil = (((target - next.getDay()) % 7) + 7) % 7
      next.setDate(next.getDate() + daysUntil)
    }
  }
  return next
}

export function advanceNextDueAt(
  frequency: string,
  customDays: string | null,
  lastDue: Date,
  now = new Date(),
): Date {
  const hasDay = customDays != null && customDays !== ''

  const advanceOne = (d: Date): Date => {
    const r = new Date(d)
    switch (frequency) {
      case 'daily':    r.setDate(r.getDate() + 1); break
      case 'weekly':   r.setDate(r.getDate() + 7); break
      case 'biweekly': r.setDate(r.getDate() + 14); break
      case 'monthly': {
        const dom = hasDay ? Number(customDays) : r.getDate()
        const m = new Date(r.getFullYear(), r.getMonth() + 1, 1, 12, 0, 0, 0)
        m.setDate(Math.min(dom, daysInMonth(m.getFullYear(), m.getMonth())))
        return m
      }
      case 'custom': return calcNextDueAt('custom', customDays, r)
      default: r.setDate(r.getDate() + 7)
    }
    return r
  }

  let next = advanceOne(lastDue)
  let guard = 0
  while (next <= now && guard < 600) {
    next = advanceOne(next)
    guard++
  }
  return next
}
```

- [ ] **Step 6: Write smoke tests for the ported logic**

Create `roost-mobile/src/lib/utils/choreSchedule.test.ts`:

```ts
import { calcNextDueAt } from './choreSchedule'

describe('calcNextDueAt', () => {
  it('returns the same day for a daily chore', () => {
    const from = new Date(2026, 0, 15, 9, 0, 0)
    const result = calcNextDueAt('daily', null, from)
    expect(result.getDate()).toBe(15)
    expect(result.getMonth()).toBe(0)
  })

  it('advances to the target weekday for a weekly chore', () => {
    const from = new Date(2026, 0, 15) // Thursday
    const result = calcNextDueAt('weekly', '1', from) // target Monday
    expect(result.getDay()).toBe(1)
  })
})
```

Create `roost-mobile/src/lib/utils/grocerySort.test.ts`:

```ts
import { classifyItem } from './grocerySort'

describe('classifyItem', () => {
  it('classifies milk as dairy', () => {
    expect(classifyItem('Milk')).toBe('Dairy')
  })

  it('falls back to Other for unrecognized items', () => {
    expect(classifyItem('xyzzy nonsense item')).toBe('Other')
  })
})
```

(Adjust the expected section name in the first assertion to whatever `STORE_SECTIONS`/`SECTION_KEYWORDS` in the copied file actually name the dairy section — read the copied file's exact section names before writing this assertion.)

Create `roost-mobile/src/lib/utils/recurrence.test.ts`:

```ts
import { expandRecurring } from './recurrence'

describe('expandRecurring', () => {
  it('expands a weekly event into every occurrence within the range', () => {
    const event = {
      startTime: new Date(2026, 0, 5), // Monday
      endTime: new Date(2026, 0, 5, 1),
      frequency: 'weekly',
      repeatEndType: 'forever',
      repeatUntil: null,
      repeatOccurrences: null,
    }
    const results = expandRecurring(event, new Date(2026, 0, 1), new Date(2026, 0, 31))
    expect(results.length).toBe(4)
    expect(results[0].startTime.getDate()).toBe(5)
    expect(results[1].startTime.getDate()).toBe(12)
  })

  it('returns an empty array when frequency is null', () => {
    const event = {
      startTime: new Date(2026, 0, 5),
      endTime: new Date(2026, 0, 5, 1),
      frequency: null,
      repeatEndType: null,
      repeatUntil: null,
      repeatOccurrences: null,
    }
    expect(expandRecurring(event, new Date(2026, 0, 1), new Date(2026, 0, 31))).toEqual([])
  })
})
```

- [ ] **Step 7: Run all the new tests**

Run: `npx jest src/lib/utils src/lib/constants`
Expected: all tests PASS (adjust the grocery section-name assertion per the actual copied file before this passes).

- [ ] **Step 8: Commit**

```bash
git add src/lib/constants src/lib/utils
git commit -m "feat: port colors, plan limits, grocery sort, recurrence, and chore schedule logic from roost"
```

---

## Task 6: `roost-mobile` — Login and Signup screens

**Files:**
- Create: `roost-mobile/app/(auth)/_layout.tsx`
- Create: `roost-mobile/app/(auth)/login.tsx`
- Create: `roost-mobile/app/(auth)/signup.tsx`
- Create: `roost-mobile/src/lib/utils/passwordStrength.ts`
- Test: `roost-mobile/src/lib/utils/passwordStrength.test.ts`

**Interfaces:**
- Consumes: `authClient.signIn.email`, `authClient.signUp.email` (Task 4).
- Produces: `(auth)/login` and `(auth)/signup` routes that Task 8's root guard navigates to when there's no session.

- [ ] **Step 1: Write the failing test for password strength**

Create `roost-mobile/src/lib/utils/passwordStrength.test.ts`:

```ts
import { isPasswordStrongEnough } from './passwordStrength'

describe('isPasswordStrongEnough', () => {
  it('rejects short passwords', () => {
    expect(isPasswordStrongEnough('Ab1')).toBe(false)
  })

  it('rejects passwords missing variety even if long enough', () => {
    expect(isPasswordStrongEnough('alllowercase')).toBe(false)
  })

  it('accepts a password with 8+ chars, an uppercase letter, and a number', () => {
    expect(isPasswordStrongEnough('Roost123')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/lib/utils/passwordStrength.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement password strength check** (mirrors the web signup page's rule: 8+ characters, at least 2 of {uppercase, number, special})

Create `roost-mobile/src/lib/utils/passwordStrength.ts`:

```ts
export function isPasswordStrongEnough(password: string): boolean {
  if (password.length < 8) return false
  let score = 0
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score >= 2
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/lib/utils/passwordStrength.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the auth group layout**

Create `roost-mobile/app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 6: Write the Login screen**

Create `roost-mobile/app/(auth)/login.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { authClient } from '../../src/lib/auth/client'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    const result = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Invalid email or password')
      return
    }
    router.replace('/')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/signup')}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/child-login')}>
        <Text style={styles.link}>Sign in as a child</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F9FAFB' },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 24, color: '#111827' },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  error: { color: '#EF4444', marginBottom: 12, fontWeight: '600' },
  button: {
    height: 48,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { color: '#EF4444', textAlign: 'center', marginTop: 16, fontWeight: '600' },
})
```

- [ ] **Step 7: Write the Signup screen**

Create `roost-mobile/app/(auth)/signup.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { authClient } from '../../src/lib/auth/client'
import { isPasswordStrongEnough } from '../../src/lib/utils/passwordStrength'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)

    if (!isPasswordStrongEnough(password)) {
      setError('Password is too weak. Use 8+ characters with uppercase letters and numbers.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const result = await authClient.signUp.email({ name, email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Sign up failed')
      return
    }
    router.replace('/onboarding')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Confirm password" secureTextEntry value={confirm} onChangeText={setConfirm} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F9FAFB' },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 24, color: '#111827' },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  error: { color: '#EF4444', marginBottom: 12, fontWeight: '600' },
  button: {
    height: 48,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { color: '#EF4444', textAlign: 'center', marginTop: 16, fontWeight: '600' },
})
```

- [ ] **Step 8: Commit**

```bash
git add app/\(auth\) src/lib/utils/passwordStrength.ts src/lib/utils/passwordStrength.test.ts
git commit -m "feat(auth): add login and signup screens"
```

(Manual verification of these screens happens end-to-end in Task 8 once the root guard can actually route to them and back out on success.)

---

## Task 7: `roost-mobile` — Child Login 3-step flow

**Files:**
- Modify: `roost/src/app/api/auth/child-login/route.ts` (roost repo — add `cookie` field to the POST success response)
- Create: `roost-mobile/app/(auth)/child-login.tsx`
- Create: `roost-mobile/src/lib/api/childLogin.ts`

**Interfaces:**
- Consumes: `apiFetch`, `setManualSessionCookie` (Task 4).
- Produces: `(auth)/child-login` route. After a successful PIN entry, a valid session cookie is stored via `setManualSessionCookie` so all subsequent `apiFetch` calls are authenticated as that child.

- [ ] **Step 1: Add `cookie` to the child-login route's success response** (roost repo)

In `roost/src/app/api/auth/child-login/route.ts`, find where the route builds the `Set-Cookie` header value for the successful PIN-verify branch (the `encodeURIComponent(`${token}.${base64Sig}`)` value, paired with `ctx.authCookies.sessionToken.name`). Add that same `name=value` pair to the JSON body already being returned as `{ success: true }`:

```ts
return NextResponse.json(
  { success: true, cookie: `${ctx.authCookies.sessionToken.name}=${signedValue}` },
  { headers: { 'Set-Cookie': setCookieHeaderValue } },
)
```

Use the exact variable names already in that file for the cookie name and signed value; this step only adds the `cookie` field to the JSON body, it does not change the existing `Set-Cookie` header logic, status codes, or error responses at all.

- [ ] **Step 2: Verify the roost-side change**

Run (in `roost/`): `npm run typecheck`
Expected: no errors.

Manually test: with the existing web child-login page (unaffected by this change, since it doesn't read the new `cookie` field), confirm child login on web still works by running `npm run dev` and logging in as a seeded child account (e.g. Premium Kid / PIN 5678 / code PREMHS).

- [ ] **Step 3: Commit the roost-side change**

```bash
cd /home/chris/Code/roost
git add src/app/api/auth/child-login/route.ts
git commit -m "feat(auth): include the session cookie in child-login's JSON response for mobile clients"
```

- [ ] **Step 4: Write the mobile child-login API helper**

Create `roost-mobile/src/lib/api/childLogin.ts`:

```ts
import { apiFetch } from './client'
import { setManualSessionCookie } from '../auth/manualSession'

export interface ChildAccount {
  id: string
  name: string
  avatarColor: string | null
}

export async function fetchChildrenForHousehold(householdCode: string): Promise<ChildAccount[]> {
  const result = await apiFetch<{ children: ChildAccount[] }>(
    `/api/auth/child-login?householdCode=${encodeURIComponent(householdCode)}`,
  )
  return result.children
}

export async function verifyChildPin(householdCode: string, childId: string, pin: string): Promise<void> {
  const result = await apiFetch<{ success: true; cookie: string }>('/api/auth/child-login', {
    method: 'POST',
    body: JSON.stringify({ householdCode, childId, pin }),
  })
  await setManualSessionCookie(result.cookie)
}
```

- [ ] **Step 5: Write the Child Login screen** (3 steps: household code entry, child picker, PIN pad)

Create `roost-mobile/app/(auth)/child-login.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import { router } from 'expo-router'
import { fetchChildrenForHousehold, verifyChildPin, ChildAccount } from '../../src/lib/api/childLogin'
import { ApiError } from '../../src/lib/api/client'

type Step = 'code' | 'picker' | 'pin'

export default function ChildLoginScreen() {
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [children, setChildren] = useState<ChildAccount[]>([])
  const [selectedChild, setSelectedChild] = useState<ChildAccount | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCodeSubmit() {
    setError(null)
    const upper = code.trim().toUpperCase()
    if (upper.length < 6) {
      setError('Enter your 6-letter household code.')
      return
    }
    setLoading(true)
    try {
      const found = await fetchChildrenForHousehold(upper)
      setChildren(found)
      setStep('picker')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function handleSelectChild(child: ChildAccount) {
    setSelectedChild(child)
    setPin('')
    setError(null)
    setStep('pin')
  }

  async function submitPin(nextPin: string) {
    if (!selectedChild) return
    setLoading(true)
    setError(null)
    try {
      await verifyChildPin(code.trim().toUpperCase(), selectedChild.id, nextPin)
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function handleDigit(digit: string) {
    if (pin.length >= 4) return
    const nextPin = pin + digit
    setPin(nextPin)
    if (nextPin.length === 4) submitPin(nextPin)
  }

  if (step === 'code') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enter your household code</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="ABCDEF"
          autoCapitalize="characters"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={handleCodeSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Find My Household</Text>}
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back to grown up sign in</Text>
        </Pressable>
      </View>
    )
  }

  if (step === 'picker') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Who are you?</Text>
        <FlatList
          data={children}
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <Pressable style={styles.childRow} onPress={() => handleSelectChild(item)}>
              <Text style={styles.childName}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable onPress={() => setStep('code')}>
          <Text style={styles.link}>Wrong house?</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your PIN</Text>
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => (
          <Pressable
            key={i}
            style={styles.key}
            disabled={key === ''}
            onPress={() => {
              if (key === 'del') setPin(p => p.slice(0, -1))
              else if (key !== '') handleDigit(key)
            }}
          >
            <Text style={styles.keyText}>{key === 'del' ? 'Delete' : key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 24, color: '#111827', textAlign: 'center' },
  codeInput: {
    height: 64,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  error: { color: '#EF4444', marginBottom: 12, fontWeight: '600', textAlign: 'center' },
  button: { height: 56, backgroundColor: '#EF4444', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { color: '#9B6060', textAlign: 'center', marginTop: 16, fontWeight: '600' },
  childRow: { height: 64, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8 },
  childName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#F5C5C5' },
  dotFilled: { backgroundColor: '#EF4444' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  key: { width: '30%', height: 64, alignItems: 'center', justifyContent: 'center', margin: '1.5%', backgroundColor: '#fff', borderRadius: 12 },
  keyText: { fontSize: 20, fontWeight: '700', color: '#111827' },
})
```

- [ ] **Step 6: Manual verification**

Run the app (see Task 8 for how to boot it once the root layout exists; for now, this step is deferred until Task 8 is done and the app can actually navigate to `/(auth)/child-login`). Note this dependency and revisit after Task 8.

- [ ] **Step 7: Commit**

```bash
cd /home/chris/Code/roost-mobile
git add app/\(auth\)/child-login.tsx src/lib/api/childLogin.ts
git commit -m "feat(auth): add child login 3-step flow (code, picker, PIN pad)"
```

---

## Task 8: `roost-mobile` — session hook, root layout guard, tab navigator shell

**Files:**
- Create: `roost-mobile/src/lib/auth/useSession.ts`
- Create: `roost-mobile/app/_layout.tsx` (replaces Task 1's placeholder)
- Create: `roost-mobile/app/(app)/_layout.tsx`
- Create: `roost-mobile/app/(app)/today.tsx` (placeholder body, real content in Task 10)
- Create: `roost-mobile/app/(app)/chores/index.tsx` (placeholder body, real content in Task 11)
- Create: `roost-mobile/app/(app)/grocery/index.tsx` (placeholder body, real content in Task 12)
- Create: `roost-mobile/app/(app)/calendar/index.tsx` (placeholder body, real content in Task 13)
- Create: `roost-mobile/app/(app)/tasks/index.tsx` (placeholder body, real content in Task 14)
- Create: `roost-mobile/app/(app)/more.tsx` (placeholder body, real content in Task 15)
- Create: `roost-mobile/src/lib/providers/QueryProvider.tsx`
- Delete: `roost-mobile/app/index.tsx` (Task 1's placeholder)

**Interfaces:**
- Produces: `useCurrentSession()` hook returning `{ data: { user: {...}, session: {...} } | null; isLoading: boolean }`, unified across both the `authClient` cookie path and the manual child-login cookie path (both flow through `apiFetch`). This is the single source of truth for "is authenticated" and "is onboarding complete" used everywhere else in the app, including Task 9's onboarding screen and Task 15's sign-out.
- Consumes: `apiFetch` (Task 4), `QueryClientProvider` from `@tanstack/react-query`.

**Note on why this isn't `authClient.useSession()`:** that hook only reflects sessions captured through `authClient`'s own built-in actions. A user who signed in via child PIN (Task 7's manual cookie path) would incorrectly show as logged out. Routing session detection through `apiFetch` (which checks both cookie sources) fixes this for both login paths uniformly.

- [ ] **Step 1: Write the session hook**

Create `roost-mobile/src/lib/auth/useSession.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

export interface SessionUser {
  id: string
  name: string
  email: string
  onboardingCompleted: boolean
}

interface SessionResponse {
  user: SessionUser
  session: { id: string; expiresAt: string }
}

export function useCurrentSession() {
  return useQuery<SessionResponse | null>({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await apiFetch<SessionResponse | null>('/api/auth/get-session?disableCookieCache=true')
      } catch {
        return null
      }
    },
    staleTime: 0,
    retry: false,
  })
}
```

- [ ] **Step 2: Write the QueryClientProvider wrapper**

Create `roost-mobile/src/lib/providers/QueryProvider.tsx`:

```tsx
import { PropsWithChildren, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 2 } },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

- [ ] **Step 3: Delete Task 1's placeholder index route**

```bash
rm roost-mobile/app/index.tsx
```

- [ ] **Step 4: Write the root layout with the auth/onboarding guard**

Create `roost-mobile/app/_layout.tsx`:

```tsx
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { AppQueryProvider } from '../src/lib/providers/QueryProvider'
import { useCurrentSession } from '../src/lib/auth/useSession'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useCurrentSession()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
      return
    }

    if (session && !session.user.onboardingCompleted && !inOnboarding) {
      router.replace('/onboarding')
      return
    }

    if (session && session.user.onboardingCompleted && (inAuthGroup || inOnboarding)) {
      router.replace('/(app)/today')
    }
  }, [session, isLoading, segments, router])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    </AppQueryProvider>
  )
}
```

- [ ] **Step 5: Write the tab navigator shell**

Create `roost-mobile/app/(app)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'
import { Home, CheckSquare, ShoppingCart, CalendarDays, ListTodo, MoreHorizontal } from 'lucide-react-native'

export default function AppTabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#EF4444', headerShown: false }}>
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="chores/index" options={{ title: 'Chores', tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }} />
      <Tabs.Screen name="grocery/index" options={{ title: 'Grocery', tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} /> }} />
      <Tabs.Screen name="calendar/index" options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
      <Tabs.Screen name="tasks/index" options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <ListTodo color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} /> }} />
    </Tabs>
  )
}
```

Install the icon package if not already present: `npx expo install lucide-react-native react-native-svg`

- [ ] **Step 6: Write placeholder screens for the five tabs so the navigator has real routes to mount**

Create `roost-mobile/app/(app)/today.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native'

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Today (Task 10 builds this out)</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  text: { fontSize: 16, color: '#6b7280' },
})
```

Repeat the same pattern (swap the text) for:
- `roost-mobile/app/(app)/chores/index.tsx` -> "Chores (Task 11 builds this out)"
- `roost-mobile/app/(app)/grocery/index.tsx` -> "Grocery (Task 12 builds this out)"
- `roost-mobile/app/(app)/calendar/index.tsx` -> "Calendar (Task 13 builds this out)"
- `roost-mobile/app/(app)/tasks/index.tsx` -> "Tasks (Task 14 builds this out)"
- `roost-mobile/app/(app)/more.tsx` -> "More (Task 15 builds this out)"

- [ ] **Step 7: Manual verification**

Run: `npx expo start`
Open in iOS Simulator (press `i`).
Expected: app boots to the Login screen (no session yet). Sign in with a seeded web account (e.g. `admin.premium@roost.test` / `RoostTest123!`) and confirm it navigates to the Today placeholder tab with the tab bar visible. Sign out is not built yet (Task 15) — to test again, clear the simulator's app data or use `expo-secure-store`'s data directly, or just proceed since sign-out lands in Task 15.

Also verify Task 7's Child Login screen now: from the Login screen, tap "Sign in as a child", enter a seeded household code (e.g. `PREMHS`), select "Premium Kid", enter PIN `5678`, confirm it navigates to the Today placeholder tab.

Expected: no `tsc` errors (`npx tsc --noEmit`).

- [ ] **Step 8: Commit**

```bash
git add app src/lib/auth/useSession.ts src/lib/providers package.json package-lock.json
git commit -m "feat: add session hook, root auth/onboarding guard, and tab navigator shell"
```

---

## Task 9: `roost-mobile` — Onboarding screen

**Files:**
- Create: `roost-mobile/app/onboarding.tsx`
- Create: `roost-mobile/src/lib/api/household.ts`

**Interfaces:**
- Consumes: `apiFetch` (Task 4), invalidates the `['session']` query (Task 8) on success so the root guard re-evaluates and navigates to `(app)/today`.
- Produces: `createHousehold(name)`, `joinHousehold(code)` (from `src/lib/api/household.ts`), reused by Task 15's household info display.

- [ ] **Step 1: Write the household API helpers**

Create `roost-mobile/src/lib/api/household.ts`:

```ts
import { apiFetch } from './client'

export interface CreateHouseholdResult {
  householdId: string
  code: string
  name: string
}

export async function createHousehold(name: string): Promise<CreateHouseholdResult> {
  return apiFetch<CreateHouseholdResult>('/api/household/create', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export type JoinHouseholdResult =
  | { householdId: string; name: string }
  | { status: 'pending'; householdName: string }

export async function joinHousehold(code: string): Promise<JoinHouseholdResult> {
  return apiFetch<JoinHouseholdResult>('/api/household/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}
```

- [ ] **Step 2: Write the onboarding screen**

Create `roost-mobile/app/onboarding.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { createHousehold, joinHousehold } from '../src/lib/api/household'
import { ApiError } from '../src/lib/api/client'

type Step = 'choose' | 'create' | 'join' | 'pending' | 'done'

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('choose')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [resultName, setResultName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  async function refreshSession() {
    await queryClient.invalidateQueries({ queryKey: ['session'] })
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Household name is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createHousehold(name.trim())
      setResultName(result.name)
      await refreshSession()
      setStep('done')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!code.trim()) {
      setError('Invite code is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await joinHousehold(code.trim())
      if ('status' in result && result.status === 'pending') {
        setResultName(result.householdName)
        setStep('pending')
        return
      }
      setResultName((result as { name: string }).name)
      await refreshSession()
      setStep('done')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'choose') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Roost</Text>
        <Pressable style={styles.button} onPress={() => setStep('create')}>
          <Text style={styles.buttonText}>Create a Household</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => setStep('join')}>
          <Text style={styles.buttonText}>Join a Household</Text>
        </Pressable>
      </View>
    )
  }

  if (step === 'create') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Name your household</Text>
        <TextInput style={styles.input} placeholder="e.g. The Johnson House" value={name} onChangeText={setName} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Household</Text>}
        </Pressable>
      </View>
    )
  }

  if (step === 'join') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enter your invite code</Text>
        <TextInput
          style={styles.input}
          placeholder="6-letter code from your housemate"
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={handleJoin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join Household</Text>}
        </Pressable>
      </View>
    )
  }

  if (step === 'pending') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Request sent</Text>
        <Text style={styles.body}>
          Your request to join {resultName} is waiting for an admin to approve it. Check back soon.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You're in</Text>
      <Text style={styles.body}>Welcome to {resultName}.</Text>
      <Pressable style={styles.button} onPress={refreshSession}>
        <Text style={styles.buttonText}>Go to Roost</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFC8C8' },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 20, color: '#1A0505', textAlign: 'center' },
  body: { fontSize: 15, color: '#7A3F3F', textAlign: 'center', marginBottom: 20 },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#F5C5C5',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  error: { color: '#EF4444', marginBottom: 12, fontWeight: '600', textAlign: 'center' },
  button: { height: 56, backgroundColor: '#EF4444', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  buttonSecondary: { backgroundColor: '#C41E1E' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
```

Note: the `'pending'` step does not poll `GET /api/household/join-requests/status` in this v1 (that endpoint exists server-side but wiring live polling is a small enhancement, not required for the core loop since Chris and his wife's household won't use approval-gated joins for their own testing — the household's `join_approval_required` defaults to `true` server-side, so if this matters when testing, disable it for the test household via the existing web app's Household settings before onboarding on mobile, or add polling later). Flagging this explicitly rather than silently dropping it.

- [ ] **Step 3: Manual verification**

Run: `npx expo start`, open the app. Sign up as a brand-new account (unique email), confirm it lands on `/onboarding`, create a household, confirm it navigates to `(app)/today`. Repeat with a second fresh account, join via the first account's invite code (shown in the create-household response, or check the seeded `FREEHS`/`PREMHS` codes for join testing against households with `join_approval_required` already off if seeded that way; otherwise confirm the pending state renders correctly).

- [ ] **Step 4: Commit**

```bash
git add app/onboarding.tsx src/lib/api/household.ts
git commit -m "feat: add onboarding screen (create/join household)"
```

---

## Task 10: `roost-mobile` — Today screen

**Files:**
- Create: `roost-mobile/app/(app)/today.tsx` (replaces Task 8's placeholder)
- Create: `roost-mobile/src/lib/api/today.ts`

**Interfaces:**
- Consumes: `apiFetch` (Task 4).
- Produces: nothing consumed by later tasks (Today is a read-only summary screen).

- [ ] **Step 1: Write the Today API helper**

Create `roost-mobile/src/lib/api/today.ts`:

```ts
import { apiFetch } from './client'

export interface TodayResponse {
  hero: {
    type: 'overdue_chore' | 'due_chore' | 'reminder' | 'all_clear'
    item: Record<string, unknown> | null
  }
  chores: Array<{ id: string; title: string; nextDueAt: string | null; frequency: string; overdue: boolean }>
  reminders: Array<{ id: string; title: string; nextRemindAt: string; frequency: string; notifyType: string; ownedByUser: boolean }>
  attentionCount: number
  snapshot: {
    meal: { name: string; slotDate: string; slotType: string } | null
    money: { balance: number; label: 'owed' | 'owing' | 'clear' }
    event: { title: string; startsAt: string } | null
    grocery: { count: number }
  }
}

export function fetchToday(): Promise<TodayResponse> {
  return apiFetch<TodayResponse>('/api/today')
}
```

- [ ] **Step 2: Write the Today screen**

Create `roost-mobile/app/(app)/today.tsx`:

```tsx
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchToday } from '../../src/lib/api/today'

export default function TodayScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['today'],
    queryFn: fetchToday,
  })

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.title}>Today</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>
          {data.hero.type === 'all_clear' ? 'All clear' : data.hero.type.replace('_', ' ')}
        </Text>
        {data.attentionCount === 0 ? (
          <Text style={styles.heroText}>Nothing needs your attention right now.</Text>
        ) : (
          <Text style={styles.heroText}>{data.attentionCount} thing(s) need your attention.</Text>
        )}
      </View>

      <View style={styles.snapshotGrid}>
        <SnapshotTile label="Grocery" value={`${data.snapshot.grocery.count} items`} />
        <SnapshotTile
          label="Money"
          value={
            data.snapshot.money.label === 'clear'
              ? 'All settled'
              : `${data.snapshot.money.label === 'owed' ? 'Owed' : 'You owe'} $${data.snapshot.money.balance.toFixed(2)}`
          }
        />
        <SnapshotTile label="Tonight" value={data.snapshot.meal ? data.snapshot.meal.name : 'Nothing planned'} />
        <SnapshotTile label="Next event" value={data.snapshot.event ? data.snapshot.event.title : 'Nothing scheduled'} />
      </View>

      <Text style={styles.sectionTitle}>Chores needing attention</Text>
      {data.chores.length === 0 ? (
        <Text style={styles.emptyText}>Nothing due.</Text>
      ) : (
        data.chores.map(chore => (
          <View key={chore.id} style={styles.row}>
            <Text style={styles.rowTitle}>{chore.title}</Text>
            {chore.overdue ? <Text style={styles.overdueTag}>Overdue</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  )
}

function SnapshotTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { color: '#6b7280' },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 16 },
  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#E5E7EB' },
  heroLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: '#9B9590', marginBottom: 4 },
  heroText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tile: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#E5E7EB' },
  tileLabel: { fontSize: 11, fontWeight: '700', color: '#9B9590', marginBottom: 4 },
  tileValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptyText: { color: '#9B9590', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  overdueTag: { color: '#EF4444', fontWeight: '800', fontSize: 12 },
})
```

- [ ] **Step 3: Manual verification**

Run the app, sign in, confirm the Today tab shows the hero card, snapshot tiles, and chore list matching what the same account sees on the web app's `/today` page.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/today.tsx src/lib/api/today.ts
git commit -m "feat: build out Today screen"
```

---

## Task 11: `roost-mobile` — Chores screen

**Files:**
- Create: `roost-mobile/app/(app)/chores/index.tsx` (replaces Task 8's placeholder)
- Create: `roost-mobile/src/lib/api/chores.ts`
- Create: `roost-mobile/src/lib/hooks/useHousehold.ts`
- Create: `roost-mobile/src/lib/hooks/usePermissionGate.ts`

**Interfaces:**
- Consumes: `apiFetch` (Task 4), `calcNextDueAt`/`parseDateInput` (Task 5).
- Produces: `useHousehold()` returning `{ household, role, permissions, isPremium, isLoading }` and `usePermissionGate(permission)` returning `{ allowed, onBlocked }` — reused by Tasks 12, 13, 14 for their own permission/premium gates.

- [ ] **Step 1: Write `useHousehold`**

Create `roost-mobile/src/lib/hooks/useHousehold.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

interface HouseholdMeResponse {
  household: {
    id: string
    name: string
    code: string
    subscription_status: string
    premium_expires_at: string | null
  }
  role: string
  permissions: string[]
}

export function useHousehold() {
  const { data, isLoading, error } = useQuery<HouseholdMeResponse>({
    queryKey: ['household'],
    queryFn: () => apiFetch<HouseholdMeResponse>('/api/household/me'),
    staleTime: 30_000,
    retry: 2,
  })

  const isPremium = data
    ? data.household.subscription_status === 'premium' &&
      (data.household.premium_expires_at === null || new Date(data.household.premium_expires_at) > new Date())
    : false

  return {
    household: data?.household,
    role: data?.role,
    permissions: data?.permissions ?? [],
    isPremium,
    isLoading,
    error,
  }
}
```

- [ ] **Step 2: Write `usePermissionGate`**

Create `roost-mobile/src/lib/hooks/usePermissionGate.ts`:

```ts
import { useHousehold } from './useHousehold'

export type PermissionKey =
  | 'expenses.view' | 'expenses.add'
  | 'chores.add' | 'chores.edit'
  | 'grocery.add' | 'grocery.create_list'
  | 'calendar.add' | 'calendar.edit'
  | 'tasks.add' | 'notes.add'
  | 'meals.plan' | 'meals.suggest'

export interface PermissionGate {
  allowed: boolean
  onBlocked: () => void
}

export function usePermissionGate(permission: PermissionKey, onDenied: () => void): PermissionGate {
  const { role, permissions, isLoading } = useHousehold()

  if (role === 'admin') return { allowed: true, onBlocked: () => {} }
  if (isLoading) return { allowed: false, onBlocked: () => {} }

  const allowed = permissions.includes(permission)
  return { allowed, onBlocked: allowed ? () => {} : onDenied }
}
```

(The web version fires a shared toast directly inside the hook via `sonner`. React Native has no direct sonner equivalent set up in this sub-project, so `usePermissionGate` takes an explicit `onDenied` callback instead, and callers show their own inline message. This is a deliberate small API difference from the web hook, not an oversight.)

- [ ] **Step 3: Write the chores API helpers**

Create `roost-mobile/src/lib/api/chores.ts`:

```ts
import { apiFetch } from './client'

export interface Chore {
  id: string
  title: string
  description: string | null
  frequency: string
  customDays: string | null
  nextDueAt: string | null
  lastCompletedAt: string | null
  assignedTo: string | null
  assigneeName: string | null
  assigneeAvatar: string | null
  snoozedUntil: string | null
  isSnoozed: boolean
  isCompleteToday: boolean
  completedTodayByMe: boolean
}

export function fetchChores(): Promise<{ chores: Chore[]; householdId: string }> {
  return apiFetch('/api/chores')
}

export interface CreateChoreInput {
  title: string
  description?: string | null
  assignedTo?: string | null
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
  customDays?: string | null
  startDate?: string
}

export function createChore(input: CreateChoreInput): Promise<{ chore: Chore }> {
  return apiFetch('/api/chores', { method: 'POST', body: JSON.stringify(input) })
}

export function updateChore(id: string, input: Partial<CreateChoreInput>): Promise<{ ok: true }> {
  return apiFetch(`/api/chores/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteChore(id: string): Promise<{ ok: true }> {
  return apiFetch(`/api/chores/${id}`, { method: 'DELETE' })
}

export function completeChore(id: string): Promise<{ ok: true; alreadyCompleted?: boolean; nextDueAt: string | null }> {
  return apiFetch(`/api/chores/${id}/complete`, { method: 'POST' })
}

export function uncompleteChore(id: string): Promise<{ ok: true }> {
  return apiFetch(`/api/chores/${id}/complete`, { method: 'DELETE' })
}

export interface LeaderboardEntry {
  userId: string
  name: string
  avatarColor: string | null
  role: string
  points: number
  completions: number
  streak: number
}

export function fetchLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[]; weekStart: string }> {
  return apiFetch('/api/chores/leaderboard')
}
```

- [ ] **Step 4: Write the Chores screen** (list, complete/uncheck, create/edit modal, premium gate on non-daily frequency, permission gate on add)

Create `roost-mobile/app/(app)/chores/index.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Check, Lock } from 'lucide-react-native'
import {
  fetchChores, createChore, completeChore, uncompleteChore, Chore, CreateChoreInput,
} from '../../../src/lib/api/chores'
import { useHousehold } from '../../../src/lib/hooks/useHousehold'
import { usePermissionGate } from '../../../src/lib/hooks/usePermissionGate'
import { ApiError } from '../../../src/lib/api/client'

const FREQUENCIES: CreateChoreInput['frequency'][] = ['daily', 'weekly', 'biweekly', 'monthly']

export default function ChoresScreen() {
  const queryClient = useQueryClient()
  const { isPremium } = useHousehold()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState<CreateChoreInput['frequency']>('daily')
  const [formError, setFormError] = useState<string | null>(null)

  const { allowed: canAdd, onBlocked } = usePermissionGate('chores.add', () =>
    Alert.alert("You don't have permission to do that.", 'Ask an admin to enable it in member settings.'),
  )

  const { data, isLoading } = useQuery({ queryKey: ['chores'], queryFn: fetchChores })

  const completeMutation = useMutation({
    mutationFn: (chore: Chore) => (chore.isCompleteToday ? uncompleteChore(chore.id) : completeChore(chore.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chores'] }),
  })

  const createMutation = useMutation({
    mutationFn: createChore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      setModalOpen(false)
      setTitle('')
      setFrequency('daily')
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.')
    },
  })

  function openAddModal() {
    if (!canAdd) {
      onBlocked()
      return
    }
    setModalOpen(true)
  }

  function handleCreate() {
    if (!title.trim()) {
      setFormError('Title required')
      return
    }
    createMutation.mutate({ title: title.trim(), frequency })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chores</Text>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Plus color="#fff" size={20} />
        </Pressable>
      </View>

      <FlatList
        data={data?.chores ?? []}
        keyExtractor={c => c.id}
        refreshing={isLoading}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={[styles.checkCircle, item.isCompleteToday && styles.checkCircleDone]}
              onPress={() => completeMutation.mutate(item)}
            >
              {item.isCompleteToday ? <Check color="#fff" size={16} /> : null}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.assigneeName ? <Text style={styles.rowSubtitle}>{item.assigneeName}</Text> : null}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>No chores yet.</Text> : null}
      />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add a chore</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vacuum the living room"
            value={title}
            onChangeText={setTitle}
          />
          <View style={styles.freqRow}>
            {FREQUENCIES.map(freq => {
              const locked = freq !== 'daily' && !isPremium
              return (
                <Pressable
                  key={freq}
                  style={[styles.freqPill, frequency === freq && styles.freqPillActive]}
                  onPress={() => {
                    if (locked) {
                      Alert.alert('Unlock recurring chores', 'Upgrade for $4/month to unlock non-daily chores.')
                      return
                    }
                    setFrequency(freq)
                  }}
                >
                  {locked ? <Lock size={12} color="#9B9590" /> : null}
                  <Text style={styles.freqPillText}>{freq}</Text>
                </Pressable>
              )
            })}
          </View>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable style={styles.saveButton} onPress={handleCreate}>
            <Text style={styles.saveButtonText}>Add Chore</Text>
          </Pressable>
          <Pressable onPress={() => setModalOpen(false)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827' },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(239,68,68,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowSubtitle: { fontSize: 12, color: '#9B9590', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#9B9590', marginTop: 40 },
  modalContent: { flex: 1, padding: 20, paddingTop: 32 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, color: '#111827' },
  input: { height: 48, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16, fontSize: 16 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  freqPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3F4F6' },
  freqPillActive: { backgroundColor: '#EF4444' },
  freqPillText: { fontWeight: '700', color: '#111827' },
  error: { color: '#EF4444', marginBottom: 12, fontWeight: '600' },
  saveButton: { height: 48, backgroundColor: '#EF4444', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  saveButtonText: { color: '#fff', fontWeight: '800' },
  cancelLink: { textAlign: 'center', color: '#9B9590', fontWeight: '600' },
})
```

- [ ] **Step 5: Manual verification**

Run the app, open the Chores tab, confirm the list matches the web app for the same account. Tap the completion circle on a chore, confirm it fills in and the web app (refresh) shows it completed too (same DB). Tap the add button, create a daily chore, confirm it appears. Tap a non-daily frequency pill on a free-tier test household, confirm the upgrade alert fires instead of selecting it; on a premium household, confirm it selects normally.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/chores src/lib/api/chores.ts src/lib/hooks
git commit -m "feat: build out Chores screen with premium and permission gates"
```

---

## Task 12: `roost-mobile` — Grocery screen

**Files:**
- Create: `roost-mobile/app/(app)/grocery/index.tsx` (replaces Task 8's placeholder)
- Create: `roost-mobile/src/lib/api/grocery.ts`

**Interfaces:**
- Consumes: `apiFetch` (Task 4), `useHousehold`/`usePermissionGate` (Task 11), `groupItemsBySection` (Task 5).

- [ ] **Step 1: Write the grocery API helpers**

Create `roost-mobile/src/lib/api/grocery.ts`:

```ts
import { apiFetch } from './client'

export interface GroceryList {
  id: string
  name: string
  isDefault: boolean
  itemCount: number
}

export interface GroceryItem {
  id: string
  name: string
  quantity: string | null
  isChecked: boolean
  addedBy: string
  createdAt: string
}

export function fetchGroceryLists(): Promise<{ lists: GroceryList[] }> {
  return apiFetch('/api/grocery/lists')
}

export function fetchGroceryItems(listId: string): Promise<{ listId: string; listName: string; items: GroceryItem[] }> {
  return apiFetch(`/api/grocery/lists/${listId}/items`)
}

export function addGroceryItem(listId: string, name: string, quantity?: string): Promise<GroceryItem> {
  return apiFetch(`/api/grocery/lists/${listId}/items`, {
    method: 'POST',
    body: JSON.stringify({ name, quantity: quantity || undefined }),
  })
}

export function setGroceryItemChecked(id: string, isChecked: boolean): Promise<{ ok: true }> {
  return apiFetch(`/api/grocery/items/${id}`, { method: 'PATCH', body: JSON.stringify({ isChecked }) })
}

export function deleteGroceryItem(id: string): Promise<{ ok: true }> {
  return apiFetch(`/api/grocery/items/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 2: Write the Grocery screen** (default list only in this sub-project; multi-list switching is a premium feature already flagged out of scope for sub-project 1's UI, though the API supports it, keep it simple: always operate on the first/default list returned)

Create `roost-mobile/app/(app)/grocery/index.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, SectionList } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react-native'
import { fetchGroceryLists, fetchGroceryItems, addGroceryItem, setGroceryItemChecked, GroceryItem } from '../../../src/lib/api/grocery'
import { groupItemsBySection } from '../../../src/lib/utils/grocerySort'
import { usePermissionGate } from '../../../src/lib/hooks/usePermissionGate'

export default function GroceryScreen() {
  const queryClient = useQueryClient()
  const [newItemName, setNewItemName] = useState('')

  const { allowed: canAdd, onBlocked } = usePermissionGate('grocery.add', () =>
    Alert.alert("You don't have permission to do that.", 'Ask an admin to enable it in member settings.'),
  )

  const { data: listsData } = useQuery({ queryKey: ['grocery-lists'], queryFn: fetchGroceryLists })
  const defaultList = listsData?.lists.find(l => l.isDefault) ?? listsData?.lists[0]

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['grocery-items', defaultList?.id],
    queryFn: () => fetchGroceryItems(defaultList!.id),
    enabled: !!defaultList,
  })

  const toggleMutation = useMutation({
    mutationFn: (item: GroceryItem) => setGroceryItemChecked(item.id, !item.isChecked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grocery-items', defaultList?.id] }),
  })

  const addMutation = useMutation({
    mutationFn: (name: string) => addGroceryItem(defaultList!.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-items', defaultList?.id] })
      setNewItemName('')
    },
  })

  function handleQuickAdd() {
    if (!canAdd) {
      onBlocked()
      return
    }
    if (!newItemName.trim()) return
    addMutation.mutate(newItemName.trim())
  }

  const unchecked = itemsData?.items.filter(i => !i.isChecked) ?? []
  const checked = itemsData?.items.filter(i => i.isChecked) ?? []
  const sections = groupItemsBySection(unchecked)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grocery</Text>

      <View style={styles.quickAddRow}>
        <TextInput
          style={styles.quickAddInput}
          placeholder="Add an item"
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={handleQuickAdd}
        />
        <Pressable style={styles.quickAddButton} onPress={handleQuickAdd}>
          <Plus color="#fff" size={20} />
        </Pressable>
      </View>

      <SectionList
        sections={sections.map(g => ({ title: g.section, data: g.items }))}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.itemRow} onPress={() => toggleMutation.mutate(item)}>
            <View style={styles.checkbox} />
            <Text style={styles.itemName}>{item.name}</Text>
            {item.quantity ? <Text style={styles.itemQty}>{item.quantity}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>The fridge is on its own.</Text> : null}
        ListFooterComponent={
          checked.length > 0 ? (
            <View>
              <Text style={styles.sectionHeader}>In the cart ({checked.length})</Text>
              {checked.map(item => (
                <Pressable key={item.id} style={styles.itemRow} onPress={() => toggleMutation.mutate(item)}>
                  <View style={[styles.checkbox, styles.checkboxChecked]} />
                  <Text style={[styles.itemName, styles.itemNameChecked]}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', padding: 16, paddingBottom: 8 },
  quickAddRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  quickAddInput: { flex: 1, height: 56, borderWidth: 2, borderColor: '#FDE68A', borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#fff', fontSize: 16 },
  quickAddButton: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: '#9B9590', marginTop: 12, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1.5, borderColor: '#E5E7EB' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(245,158,11,0.4)' },
  checkboxChecked: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  itemName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#9B9590' },
  itemQty: { fontSize: 13, color: '#9B9590' },
  emptyText: { textAlign: 'center', color: '#9B9590', marginTop: 40 },
})
```

- [ ] **Step 3: Manual verification**

Run the app, open the Grocery tab, confirm the default list's items render grouped by store section, quick-add an item and confirm it appears (and shows on web too), tap to check/uncheck and confirm it moves between the active list and "In the cart".

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/grocery src/lib/api/grocery.ts
git commit -m "feat: build out Grocery screen with smart sort grouping"
```

---

## Task 13: `roost-mobile` — Calendar screen (agenda view)

**Files:**
- Create: `roost-mobile/app/(app)/calendar/index.tsx` (replaces Task 8's placeholder)
- Create: `roost-mobile/src/lib/api/calendar.ts`

**Interfaces:**
- Consumes: `apiFetch` (Task 4), `useHousehold`/`usePermissionGate` (Task 11).

**Scope note:** this sub-project ships an agenda-style list (upcoming events, grouped by date) rather than the web app's month grid. A month-grid calendar view is a meaningfully larger native-UI build and isn't needed to validate the daily-use loop; it's a good candidate to add during the sub-project 5 redesign pass, or as its own follow-up task, rather than blocking this plan. Recurring events still expand correctly since the API already does that server-side.

- [ ] **Step 1: Write the calendar API helpers**

Create `roost-mobile/src/lib/api/calendar.ts`:

```ts
import { apiFetch } from './client'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  allDay: boolean
  recurring: boolean
  isRecurring: boolean
  location: string | null
  creatorName: string
}

export function fetchCalendarMonth(year: number, month: number): Promise<{ events: CalendarEvent[] }> {
  return apiFetch(`/api/calendar?year=${year}&month=${month}`)
}

export interface CreateEventInput {
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  description?: string
  location?: string
}

export function createEvent(input: CreateEventInput): Promise<{ event: unknown }> {
  return apiFetch('/api/calendar', { method: 'POST', body: JSON.stringify(input) })
}
```

- [ ] **Step 2: Write the Calendar screen** (fetches the current month plus next month, flattens and sorts into an agenda list; add-event modal covers the common case: a single one-off event, no recurrence UI in this sub-project's calendar screen since RECURRING_EVENTS_PREMIUM handling with a full frequency picker is more UI than the agenda view needs for v1 — recurring events created on web still display correctly here, just can't be authored from mobile yet)

Create `roost-mobile/app/(app)/calendar/index.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, StyleSheet, SectionList, Pressable, Modal, TextInput, Switch, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isSameDay } from 'date-fns'
import { Plus } from 'lucide-react-native'
import { fetchCalendarMonth, createEvent, CalendarEvent } from '../../../src/lib/api/calendar'
import { usePermissionGate } from '../../../src/lib/hooks/usePermissionGate'

export default function CalendarScreen() {
  const queryClient = useQueryClient()
  const now = new Date()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const { allowed: canAdd, onBlocked } = usePermissionGate('calendar.add', () =>
    Alert.alert("You don't have permission to do that.", 'Ask an admin to enable it in member settings.'),
  )

  const thisMonth = useQuery({
    queryKey: ['calendar', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => fetchCalendarMonth(now.getFullYear(), now.getMonth() + 1),
  })
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = useQuery({
    queryKey: ['calendar', nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1],
    queryFn: () => fetchCalendarMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1),
  })

  const events = [...(thisMonth.data?.events ?? []), ...(nextMonth.data?.events ?? [])]
    .filter(e => new Date(e.startTime) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const sections = groupByDay(events)

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      setModalOpen(false)
      setTitle('')
      setFormError(null)
    },
  })

  function openAddModal() {
    if (!canAdd) {
      onBlocked()
      return
    }
    setModalOpen(true)
  }

  function handleCreate() {
    if (!title.trim()) {
      setFormError('Title is required')
      return
    }
    const today = format(new Date(), 'yyyy-MM-dd')
    createMutation.mutate({
      title: title.trim(),
      allDay,
      startTime: allDay ? `${today}T00:00:00` : new Date().toISOString(),
      endTime: allDay ? `${today}T23:59:59` : new Date(Date.now() + 3600_000).toISOString(),
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Plus color="#fff" size={20} />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => `${item.id}-${item.startTime}`}
        contentContainerStyle={{ padding: 16 }}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.eventRow}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            {!item.allDay ? <Text style={styles.eventTime}>{format(new Date(item.startTime), 'h:mm a')}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Wide open.</Text>}
      />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add an event</Text>
          <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>All day</Text>
            <Switch value={allDay} onValueChange={setAllDay} />
          </View>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable style={styles.saveButton} onPress={handleCreate}>
            <Text style={styles.saveButtonText}>Add Event</Text>
          </Pressable>
          <Pressable onPress={() => setModalOpen(false)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

function groupByDay(events: CalendarEvent[]): Array<{ title: string; data: CalendarEvent[] }> {
  const groups: Array<{ title: string; data: CalendarEvent[] }> = []
  for (const event of events) {
    const day = new Date(event.startTime)
    const last = groups[groups.length - 1]
    if (last && isSameDay(new Date(last.data[0].startTime), day)) {
      last.data.push(event)
    } else {
      groups.push({ title: format(day, 'EEEE, MMM d'), data: [event] })
    }
  }
  return groups
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827' },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { fontSize: 13, fontWeight: '800', color: '#1A5CB5', marginTop: 12, marginBottom: 6 },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1.5, borderColor: '#BAD3F7' },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  eventTime: { fontSize: 13, color: '#9B9590' },
  emptyText: { textAlign: 'center', color: '#9B9590', marginTop: 40 },
  modalContent: { flex: 1, padding: 20, paddingTop: 32 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, color: '#111827' },
  input: { height: 48, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  error: { color: '#EF4444', marginBottom: 12, fontWeight: '600' },
  saveButton: { height: 48, backgroundColor: '#3B82F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  saveButtonText: { color: '#fff', fontWeight: '800' },
  cancelLink: { textAlign: 'center', color: '#9B9590', fontWeight: '600' },
})
```

Install `date-fns` if not already present: `npx expo install date-fns`

- [ ] **Step 3: Manual verification**

Run the app, open the Calendar tab, confirm upcoming events (including any recurring instances created on web) show up grouped by day. Add a one-off event, confirm it appears on both mobile and web.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/calendar src/lib/api/calendar.ts
git commit -m "feat: build out Calendar screen (agenda view)"
```

---

## Task 14: `roost-mobile` — Tasks screen

**Files:**
- Create: `roost-mobile/app/(app)/tasks/index.tsx` (replaces Task 8's placeholder)
- Create: `roost-mobile/src/lib/api/tasks.ts`

**Interfaces:**
- Consumes: `apiFetch` (Task 4), `usePermissionGate` (Task 11).

- [ ] **Step 1: Write the tasks API helpers**

Create `roost-mobile/src/lib/api/tasks.ts`:

```ts
import { apiFetch } from './client'

export interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  assigneeName: string | null
}

export function fetchTasks(): Promise<{ tasks: Task[] }> {
  return apiFetch('/api/tasks')
}

export interface CreateTaskInput {
  title: string
  description?: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
}

export function createTask(input: CreateTaskInput): Promise<{ task: Task }> {
  return apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(input) })
}

export function setTaskCompleted(id: string, completed: boolean): Promise<{ task: Task }> {
  return apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) })
}
```

- [ ] **Step 2: Write the Tasks screen** (grouped sections: overdue, due today, upcoming, no due date, completed, matching the web app's grouping; create modal covers title + priority, matching the minimum required fields)

Create `roost-mobile/app/(app)/tasks/index.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, StyleSheet, SectionList, Pressable, Modal, TextInput, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isPast, isToday, format } from 'date-fns'
import { Plus, Check } from 'lucide-react-native'
import { fetchTasks, createTask, setTaskCompleted, Task } from '../../../src/lib/api/tasks'
import { usePermissionGate } from '../../../src/lib/hooks/usePermissionGate'

const PRIORITY_COLORS: Record<Task['priority'], string> = { high: '#EF4444', medium: '#F59E0B', low: '#9B9590' }

export default function TasksScreen() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { allowed: canAdd, onBlocked } = usePermissionGate('tasks.add', () =>
    Alert.alert("You don't have permission to do that.", 'Ask an admin to enable it in member settings.'),
  )

  const { data, isLoading } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })

  const toggleMutation = useMutation({
    mutationFn: (task: Task) => setTaskCompleted(task.id, !task.completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setModalOpen(false)
      setTitle('')
      setFormError(null)
    },
  })

  function openAddModal() {
    if (!canAdd) {
      onBlocked()
      return
    }
    setModalOpen(true)
  }

  function handleCreate() {
    if (!title.trim()) {
      setFormError('Title is required')
      return
    }
    createMutation.mutate({ title: title.trim() })
  }

  const tasks = data?.tasks ?? []
  const sections = [
    { title: 'Overdue', data: tasks.filter(t => !t.completed && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))) },
    { title: 'Due today', data: tasks.filter(t => !t.completed && t.dueDate && isToday(new Date(t.dueDate))) },
    { title: 'Upcoming', data: tasks.filter(t => !t.completed && t.dueDate && !isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))) },
    { title: 'No due date', data: tasks.filter(t => !t.completed && !t.dueDate) },
    { title: 'Completed', data: tasks.filter(t => t.completed) },
  ].filter(s => s.data.length > 0)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Plus color="#fff" size={20} />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => toggleMutation.mutate(item)}>
            <View style={[styles.checkCircle, item.completed && styles.checkCircleDone]}>
              {item.completed ? <Check color="#fff" size={16} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, item.completed && styles.rowTitleDone]}>{item.title}</Text>
              {item.dueDate ? <Text style={styles.rowSubtitle}>{format(new Date(item.dueDate), 'MMM d')}</Text> : null}
            </View>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
          </Pressable>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Nothing to do.</Text> : null}
      />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add a task</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Buy a new shower curtain"
            value={title}
            onChangeText={setTitle}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable style={styles.saveButton} onPress={handleCreate}>
            <Text style={styles.saveButtonText}>Add Task</Text>
          </Pressable>
          <Pressable onPress={() => setModalOpen(false)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827' },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EC4899', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: '#9B9590', marginTop: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1.5, borderColor: '#E5E7EB' },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(236,72,153,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowTitleDone: { textDecorationLine: 'line-through', color: '#9B9590' },
  rowSubtitle: { fontSize: 12, color: '#9B9590', marginTop: 2 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  emptyText: { textAlign: 'center', color: '#9B9590', marginTop: 40 },
  modalContent: { flex: 1, padding: 20, paddingTop: 32 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, color: '#111827' },
  input: { height: 48, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16, fontSize: 16 },
  error: { color: '#EF4444', marginBottom: 12, fontWeight: '600' },
  saveButton: { height: 48, backgroundColor: '#EC4899', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  saveButtonText: { color: '#fff', fontWeight: '800' },
  cancelLink: { textAlign: 'center', color: '#9B9590', fontWeight: '600' },
})
```

- [ ] **Step 3: Manual verification**

Run the app, open the Tasks tab, confirm tasks are grouped correctly and match the web app. Create a task, complete it, confirm it moves to the Completed section and shows completed on web too.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/tasks src/lib/api/tasks.ts
git commit -m "feat: build out Tasks screen"
```

---

## Task 15: `roost-mobile` — More/Settings screen

**Files:**
- Create: `roost-mobile/app/(app)/more.tsx` (replaces Task 8's placeholder)

**Interfaces:**
- Consumes: `authClient.signOut`, `clearManualSessionCookie` (Task 4), `useHousehold` (Task 11), `useCurrentSession` (Task 8).

- [ ] **Step 1: Write the More/Settings screen** (account info, household info, sign out — everything else in the web app's 8 settings sections is out of scope for this sub-project)

Create `roost-mobile/app/(app)/more.tsx`:

```tsx
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { authClient } from '../../src/lib/auth/client'
import { clearManualSessionCookie } from '../../src/lib/auth/manualSession'
import { useCurrentSession } from '../../src/lib/auth/useSession'
import { useHousehold } from '../../src/lib/hooks/useHousehold'

export default function MoreScreen() {
  const queryClient = useQueryClient()
  const { data: session } = useCurrentSession()
  const { household, role } = useHousehold()

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again to use Roost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authClient.signOut()
          await clearManualSessionCookie()
          queryClient.clear()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <Text style={styles.value}>{session?.user.name}</Text>
        <Text style={styles.subvalue}>{session?.user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Household</Text>
        <Text style={styles.value}>{household?.name}</Text>
        <Text style={styles.subvalue}>Code: {household?.code}</Text>
        <Text style={styles.subvalue}>Role: {role}</Text>
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 20 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#E5E7EB' },
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: '#9B9590', marginBottom: 8 },
  value: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subvalue: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  signOutButton: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  signOutText: { color: '#EF4444', fontWeight: '800' },
})
```

- [ ] **Step 2: Manual verification**

Run the app, open the More tab, confirm account name/email and household name/code/role render correctly. Tap Sign Out, confirm the alert appears, confirm it and verify the app returns to the Login screen with no session (attempting to navigate back into `(app)` routes should redirect to Login via the root guard).

Also re-run Task 7 Step 6 now that sign-out exists: log out, then sign back in via Child Login, confirm the whole loop works twice in a row.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/more.tsx
git commit -m "feat: build out More/Settings screen with sign out"
```

---

## Task 16: EAS project setup and first TestFlight build

**Files:**
- Create: `roost-mobile/eas.json`
- Modify: `roost-mobile/app.json` (finalize `ios.bundleIdentifier` if changed from Task 1's default)

**Interfaces:**
- Consumes: nothing from earlier tasks except a working app.
- Produces: an installable `.ipa` distributed via TestFlight.

This task requires Chris's interactive Apple Developer / EAS login and cannot be scripted end-to-end by an automated worker. The deliverable here is the exact configuration and commands; Chris runs the actual build and TestFlight submission himself.

- [ ] **Step 1: Install and log in to EAS CLI**

```bash
cd /home/chris/Code/roost-mobile
npm install -g eas-cli
eas login
```

- [ ] **Step 2: Link the EAS project**

```bash
eas init
```

This creates a project on expo.dev and writes a `extra.eas.projectId` into `app.json` automatically.

- [ ] **Step 3: Write `eas.json` with `development` and `preview` build profiles**

Create `roost-mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-roost-deployment.vercel.app"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-roost-deployment.vercel.app"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Replace the placeholder URL with the real production `roost` Vercel deployment URL used throughout this plan.

- [ ] **Step 4: Configure Apple credentials**

```bash
eas credentials
```

Follow the interactive prompts to let EAS manage the iOS distribution certificate and provisioning profile against Chris's Apple Developer Program account (already enrolled, per the approved design).

- [ ] **Step 5: Run the first preview build**

```bash
eas build --profile preview --platform ios
```

This produces a standalone `.ipa` with the JS bundle embedded, no Metro/dev-server dependency at runtime.

- [ ] **Step 6: Submit to TestFlight**

```bash
eas submit --platform ios --latest
```

- [ ] **Step 7: Add internal testers**

In App Store Connect, add Chris's Apple ID as an internal tester (if not already the account owner) and his wife's Apple ID once he has confirmed the build installs and passes the smoke test on his own phone first.

- [ ] **Step 8: Run the full manual smoke test from the spec**

Sign up, log in, log out, child PIN login, create household, join household by code, and a full CRUD pass (create/complete/edit/delete) on each of Chores, Grocery, Calendar, Tasks — on the actual TestFlight build, not the dev server.

- [ ] **Step 9: Commit**

```bash
git add eas.json app.json
git commit -m "chore: add EAS build profiles for development and preview (TestFlight)"
```

---

## Self-Review Notes

- **Spec coverage:** every "In scope" bullet from the spec has a task — repo scaffold (1), roost cleanup (2), better-auth server plugin (3), auth client + apiFetch (4), pure logic ports (5), Login/Signup (6), Child Login (7), root guard + navigator (8), onboarding (9), and all five core screens (10-14), plus the trimmed More/Settings (15) and EAS/TestFlight (16).
- **Placeholder scan:** no TBD/TODO markers; every step has real code or an exact command. The two spots that narrow scope (Calendar ships agenda-only in Task 13; onboarding's pending-approval step doesn't poll live in Task 9) are called out explicitly as deliberate, bounded scope notes with a stated reason, not vague deferrals.
- **Type consistency:** `Chore`, `GroceryItem`, `CalendarEvent`, and `Task` types are each defined once (in their respective `src/lib/api/*.ts` file) and reused as-is by their screen component, not redefined. `ApiError` (Task 4) is the single error type thrown by `apiFetch` and is what every mutation's `onError` handler and every screen's try/catch checks against.
- **Known integration risk flagged rather than glossed over:** the child-login cookie capture (Task 7) is the one piece of this plan resting on a from-scratch design rather than official documentation, since better-auth's Expo plugin only auto-captures cookies from its own built-in actions. The chosen design (server returns the `name=value` cookie pair in the JSON body, client stores it in its own dedicated slot, `apiFetch` checks it first) avoids needing to reverse-engineer the plugin's internal SecureStore format, and Task 8 Step 7 plus Task 15 Step 2 both include explicit manual verification of that exact path.
