# Architecture Research: Roost V2

**Researched:** 2026-05-01
**Confidence:** MEDIUM-HIGH — Core recommendations verified via official docs and real monorepo templates; some Expo-specific details flagged as needing hands-on validation.

---

## Recommended Monorepo Structure

### Verdict: npm workspaces in the existing repo, Expo app at `apps/mobile/`, Next.js app at `apps/web/`

The existing repo stays as-is on `master`. All V2 development happens on `rebuild/v2`. The monorepo restructuring is done once at the start of V2 work on that branch.

**Recommended layout (HIGH confidence — matches Expo official docs + t3-turbo pattern):**

```
roost/                               ← repo root (existing)
├── apps/
│   ├── web/                         ← Next.js 16 app (moved from repo root)
│   │   ├── src/
│   │   │   ├── app/                 ← App Router pages
│   │   │   ├── components/          ← Web-only components (shadcn, DraggableSheet, etc.)
│   │   │   ├── lib/                 ← Web-only lib (auth config, db client)
│   │   │   └── db/                  ← Drizzle schema (stays here, mobile never touches DB directly)
│   │   ├── package.json
│   │   └── next.config.ts
│   └── mobile/                      ← Expo app (new)
│       ├── app/                     ← Expo Router file-based routes
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── signup.tsx
│       │   ├── (tabs)/
│       │   │   ├── index.tsx        ← Home / Dashboard
│       │   │   ├── household.tsx    ← Chores + Tasks + Calendar
│       │   │   ├── money.tsx        ← Expenses + Grocery + Meals
│       │   │   ├── people.tsx       ← Members + Settings
│       │   │   └── more.tsx         ← Notes + Reminders + Stats
│       │   └── _layout.tsx
│       ├── components/              ← Mobile-only UI components
│       ├── lib/
│       │   └── auth-client.ts       ← better-auth expoClient
│       ├── package.json
│       ├── app.json
│       └── metro.config.js
├── packages/
│   ├── api-types/                   ← Shared TypeScript types (request/response shapes)
│   │   ├── src/
│   │   │   ├── chores.ts
│   │   │   ├── expenses.ts
│   │   │   ├── grocery.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── constants/                   ← Shared constants (colors, free tier limits, premium config)
│   │   ├── src/
│   │   │   ├── colors.ts
│   │   │   ├── freeTierLimits.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── utils/                       ← Shared pure utilities (zero DOM, zero React Native)
│       ├── src/
│       │   ├── time.ts              ← relativeTime()
│       │   ├── debtSimplification.ts
│       │   ├── recurrence.ts
│       │   ├── grocerySort.ts
│       │   └── index.ts
│       └── package.json
├── package.json                     ← Root with "workspaces": ["apps/*", "packages/*"]
├── vercel.json                      ← Points Vercel at apps/web
└── turbo.json                       ← Optional; add only when build caching becomes a pain point
```

### Why This Structure (and Not Alternatives)

**Option A: Keep Next.js at repo root, add `mobile/` as a sibling** — simpler in the short term but creates an awkward asymmetry. The root becomes ambiguous: is it the web app or the monorepo root? Breaks cleanly with Vercel's monorepo support. Rejected.

**Option B: Turborepo from day one** — Turborepo adds genuine value (parallel builds, task caching, build pipelines) but also adds ~2 days of config overhead for a solo developer before writing a single product feature. Add it in Phase 2 when you actually have build slowness to solve. For now, npm workspaces alone is sufficient.

**Option C: apps/web + apps/mobile with no packages/** — Tempting for simplicity, but the constants and type duplication between platforms creates drift bugs. Types and constants in `packages/` are cheap to extract and prevent an entire class of mismatches.

### Root package.json

```json
{
  "name": "roost",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "web": "npm run dev --workspace=apps/web",
    "mobile": "npm run start --workspace=apps/mobile",
    "db:push": "npm run db:push --workspace=apps/web",
    "db:seed": "npm run db:seed --workspace=apps/web"
  }
}
```

### Vercel Configuration

Vercel's monorepo support handles this natively. Set `Root Directory` to `apps/web` in the Vercel project settings. No `vercel.json` restructuring needed for web deployment.

---

## Code Sharing Strategy

### What Goes in Shared Packages

**`packages/api-types/` — TypeScript request/response types (HIGH priority)**

The single most important shared package. Both the Next.js API routes and the Expo fetch calls use these types. Prevents the most common mobile/web drift bug: API returns a new field, web uses it, mobile silently ignores it.

```typescript
// packages/api-types/src/chores.ts
export interface ChoreApiItem {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  assignedTo: string | null;
  nextDueAt: string;
  isCompleted: boolean;
  category: ChoreCategory | null;
}

export interface ChoreListResponse {
  chores: ChoreApiItem[];
  isPremium: boolean;
  isAdmin: boolean;
}
```

**`packages/constants/` — Colors, limits, premium config (HIGH priority)**

These are already zero-dependency. Pull them verbatim from `src/lib/constants/`. The Expo app's UI needs section colors; the premium gate config helps it know which features to present upgrade prompts for.

**`packages/utils/` — Pure business logic (MEDIUM priority)**

Only the functions that have zero DOM and zero React Native dependencies. Confirmed candidates from the existing codebase:
- `time.ts` — relativeTime() (date formatting, pure)
- `debtSimplification.ts` — greedy debt simplification algorithm (pure)
- `recurrence.ts` — expandRecurringEvent() (date logic, pure)
- `grocerySort.ts` — classifyItem(), groupItemsBySection() (pure string matching)

**Do NOT share:**
- Database client (`@neondatabase/serverless`) — mobile never connects to Postgres directly
- Drizzle schema — same reason; also not useful on mobile
- better-auth server config — server only
- shadcn/ui components — web-only (HTML primitives)
- framer-motion — use Reanimated on mobile
- TipTap rich text editor — use a React Native equivalent or plain TextInput
- PDF generation (pdf-lib) — mobile handles this via share sheets + server-generated PDFs

### Platform-Specific UI Strategy

**Web** uses shadcn/ui + Tailwind CSS v4. No change.

**Mobile** uses NativeWind v4 (not v5). NativeWind v5 is in preview and confirmed buggy as of research date. NativeWind v4 is stable with Expo SDK 52-54 and Tailwind v3. This is a deliberate conservative choice — the web app's Tailwind v4 is irrelevant to mobile because NativeWind is its own layer.

There is no "shared UI components" package for V2. The web and mobile UIs look similar in design language but are implemented separately. Attempting to share React components across web and mobile (via react-native-web or Solito) adds significant complexity that is not worth it for a solo developer. Build the UI twice — it is faster than managing a cross-platform component library.

---

## API Design for Multi-Client

### Current API: No Changes Required to the Route Logic

The existing Next.js API routes at `apps/web/src/app/api/` work for both web and mobile clients without structural changes. The route handlers are already thin HTTP adapters over Drizzle queries. This is the right design.

### What Does Change: Authentication Headers

The current API authenticates exclusively via `better-auth` session cookies set by the browser. React Native's fetch implementation does not automatically send cookies. Two options:

**Option A: Cookie forwarding (recommended by better-auth's own Expo plugin)**
The `@better-auth/expo` client stores session cookies in `expo-secure-store` and manually appends them to every API request header. From the API route's perspective, authentication is identical — `requireSession()` reads the cookie from the `Cookie` header regardless of whether a browser or Expo set it.

This is the approach the better-auth Expo plugin uses as of SDK 55. No API route changes needed.

**Option B: Bearer token plugin**
The better-auth Bearer plugin adds `Authorization: Bearer <token>` support. The official docs warn this should be used cautiously and only when cookies are not viable. It is the right answer if you encounter issues with cookie forwarding in production (e.g., certain CDN/load balancer setups strip Cookie headers).

**Recommendation:** Start with Option A (cookie forwarding via `@better-auth/expo`). It requires zero changes to API routes and is the officially supported pattern. Fall back to Option B only if production testing reveals cookie header issues.

### Mobile API Fetch Helper

Every Expo API call needs the auth cookie injected. Wrap fetch:

```typescript
// apps/mobile/lib/api-fetch.ts
import * as SecureStore from 'expo-secure-store';
import { authClient } from './auth-client';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookie = await authClient.getCookie();
  return fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...init?.headers,
    },
  });
}
```

`EXPO_PUBLIC_API_URL` points to the production Vercel URL in production and `http://localhost:3000` in development.

### API Response Shape: No Versioning Needed Yet

Do not add `/api/v1/` prefixes. The web and mobile apps share the same version of the API (both are deployed together). API versioning becomes relevant when you need to support old app versions after a breaking change — that is a V3 concern.

### CORS Configuration

The Next.js API routes need to accept requests from the Expo development server during development. Add to `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: process.env.EXPO_ORIGIN ?? '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Cookie,Authorization' },
      ],
    },
  ];
}
```

In production, the Expo app calls the production Vercel URL directly. No CORS issues in production because the same domain serves both the API and the mobile client's backend.

---

## Authentication on Mobile

### Mechanism: Cookie-Based Sessions via `@better-auth/expo`

**Recommendation: Use the official `@better-auth/expo` plugin with `expo-secure-store`. Do not build a custom JWT flow.**

**Confidence: HIGH** — This is the officially documented pattern from better-auth, verified against their Expo integration guide (SDK 55, May 2026).

**How it works:**
1. User signs in via `authClient.signIn.email()` in the Expo app
2. The better-auth server sets session cookies in the response
3. `@better-auth/expo` intercepts the response and stores the cookie in `expo-secure-store` (hardware-backed secure enclave on iOS, Android Keystore on Android)
4. Subsequent API calls use `authClient.getCookie()` to retrieve and forward the cookie in request headers

**Server-side changes required:**

Add the Expo plugin to the better-auth server config. Also add the Expo app scheme and Expo development URL to `trustedOrigins`:

```typescript
// apps/web/src/lib/auth/index.ts
import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';

export const auth = betterAuth({
  // ... existing config ...
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL!,
    'roost://',                    // production app scheme
    'exp://*',                     // Expo Go development
  ],
  plugins: [
    expo(),
    // ... existing plugins ...
  ],
});
```

**Client-side setup in Expo:**

```typescript
// apps/mobile/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  plugins: [
    expoClient({
      scheme: 'roost',
      storage: SecureStore,
    }),
  ],
});
```

**Child account PIN login** — not handled by the standard better-auth Expo plugin. The child login flow uses a custom endpoint (`POST /api/auth/child-login`). This endpoint already creates a session using `internalAdapter`. On mobile, call this endpoint via `apiFetch`, receive the Set-Cookie response header, and store it manually in `expo-secure-store`. This is a small amount of custom code.

### Known Issue to Watch

There is an open GitHub issue (#7674) about malformed cookies from Expo clients being rejected by certain load balancers. Vercel does not appear to be affected, but test auth end-to-end against the production Vercel URL before shipping. Do not assume development testing is sufficient.

---

## Offline Support

### Recommendation: No offline support in V2. Revisit in V3.

**Rationale:**

Roost is a collaborative household app. Its value proposition is real-time shared state: when one person checks off a grocery item, everyone else sees it. Offline-first fundamentally conflicts with this — an offline write can conflict with another member's online write, requiring conflict resolution logic that is complex to build and hard to explain to users.

**The cost of offline support:**
- `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` + `@react-native-async-storage/async-storage` — 3 new packages
- Custom `onlineManager` setup using `expo-network` for React Native network detection
- Cache invalidation strategy: what's stale, what gets written back, what conflicts
- Per-mutation persistence: mutations queued offline must survive app restarts
- Conflict resolution: what happens when two household members edit the same chore offline?
- Estimated additional complexity: 2-3 weeks of engineering, ongoing maintenance burden

**The benefit of offline support:**
- Users can add grocery items without connectivity (most useful feature offline)
- Users can view their chore list without connectivity
- Better UX in poor-connectivity situations (subway, rural areas)

**The right answer for V2:** The app already has optimistic UI for all mutations. This gives the impression of instant response even with slow connections. That covers 80% of the perceived "offline" benefit. True offline-write support is deferred.

**One exception to consider:** Read-only caching. TanStack Query's `networkMode: 'offlineFirst'` option allows cached data to be served when offline without additional packages. This is worth enabling — it costs nothing and means users can at least view their chore list and grocery items when the network drops:

```typescript
// apps/mobile/lib/query-client.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',  // serve cache when offline, don't show error
      staleTime: 30 * 1000,         // 30s on mobile (vs 10s on web — save battery)
      gcTime: 5 * 60 * 1000,        // keep cache for 5 minutes
      retry: 2,
    },
    mutations: {
      networkMode: 'online',        // mutations fail immediately when offline (no queue)
    },
  },
});
```

---

## Deep Linking

### Architecture: Universal Links (iOS) + App Links (Android) + Expo Router

**Recommendation: Use Expo Router's automatic deep linking with Universal Links for invite URLs. Do not use a custom scheme (`roost://`) as the primary mechanism for shared links.**

**Why Universal Links, not custom scheme:**

Guest invite links are shared URLs (`https://roostapp.com/invite/[token]`). If the Roost app is installed, the link opens the app. If not installed, the link opens the public invite landing page in the browser. This fallback is essential for the household growth loop — the invited person may not have the app yet.

Custom URL schemes (`roost://invite/[token]`) cannot fall back to a browser. They fail silently if the app is not installed. They are not usable in web contexts (email, iMessage link previews, etc.).

**Implementation:**

The Next.js web app already has `src/app/invite/[token]/page.tsx`. This is the fallback URL target for non-app-users. It stays as-is.

For iOS, host the `apple-app-site-association` file:

```json
// apps/web/public/.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [{
      "appIDs": ["TEAMID.com.roostapp.roost"],
      "components": [
        { "/": "/invite/*", "comment": "Guest invite links" },
        { "/": "/dashboard", "comment": "Post-auth landing" }
      ]
    }]
  }
}
```

For Android, host `/.well-known/assetlinks.json` with the app's SHA-256 fingerprint.

In `app.json`:

```json
{
  "expo": {
    "scheme": "roost",
    "ios": {
      "associatedDomains": ["applinks:roostapp.com"]
    },
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "data": [{ "scheme": "https", "host": "roostapp.com", "pathPrefix": "/invite" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

With Expo Router, create `apps/mobile/app/invite/[token].tsx`. Expo Router automatically registers the deep link route — no manual linking configuration needed.

**Note:** Universal Links require the app to be built with EAS Build (not Expo Go). During development, use the custom scheme `roost://invite/[token]` for testing. In production, Universal Links take over.

---

## Push Notifications

### V1 State

The V1 notification architecture is partially built:
- `notification_queue` table exists in the schema
- `push_token` column on `users` table
- Expo Push Notifications called from cron jobs (reminders, rewards)
- No receipt checking implemented

### V2 Production Architecture

**Required changes from V1:**

**1. Add receipt checking cron job (CRITICAL)**

Expo's two-phase notification system requires checking receipts ~15 minutes after sending tickets. Skipping this step means you get no signal on failed deliveries (bad tokens, APNs rejections, FCM errors). Add a cron endpoint:

```
/api/cron/notification-receipts    → runs every 30 minutes
```

This endpoint reads recent rows from `notification_queue` where `status = 'sent'` and `ticket_id IS NOT NULL`, calls `Expo.getPushNotificationReceiptsAsync(ticketIds)`, and:
- On `ok`: marks row `status = 'delivered'`
- On `error: DeviceNotRegistered`: marks row `status = 'failed'`, sets `users.push_token = NULL` so no further pushes to that token
- On `error: MessageTooBig` / `InvalidCredentials`: marks row `status = 'failed'`, logs for investigation

**2. Schema additions for `notification_queue`**

Add columns to track the two-phase delivery:

```sql
ticket_id        text         -- Expo ticket ID returned after sending
status           text         -- 'pending' | 'sent' | 'delivered' | 'failed'
sent_at          timestamp    -- when the push was sent to Expo
receipt_checked_at timestamp  -- when receipt was last checked
error_code       text         -- DeviceNotRegistered | MessageTooBig | etc.
```

**3. Token management on mobile**

Register for push permissions and store the token on app launch:

```typescript
// apps/mobile/lib/push-notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // simulator, skip

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // EAS project ID
  })).data;

  await apiFetch('/api/user/push-token', {
    method: 'PATCH',
    body: JSON.stringify({ pushToken: token }),
  });
}
```

Call `registerPushToken()` once after successful login, and again on app foreground if the token may have rotated.

**4. Add `/api/user/push-token` endpoint**

Simple PATCH endpoint that updates `users.push_token`. Already wired in the profile endpoint per V1 CLAUDE.md, but verify it is a standalone endpoint so mobile can call it without patching unrelated profile fields.

**5. Expo SDK 53+ change (important)**

As of Expo SDK 53, push notifications no longer work in Expo Go on Android (deprecated in SDK 52). Development testing of push notifications requires a development build via EAS Build. Plan for this in the development workflow — you need an EAS project configured before you can test push notifications on physical devices.

**6. Batching**

Use `expo-server-sdk-node` for sending. It handles automatic chunking (max 100 per request) and will prevent hitting the 600 notifications/second rate limit:

```typescript
import Expo from 'expo-server-sdk';
const expo = new Expo();
const chunks = expo.chunkPushNotifications(messages);
```

### Notification Types in V2

| Trigger | Current V1 | V2 Change |
|---------|-----------|-----------|
| Chore reminders | Cron fires push | No change |
| Reward earned/missed | Cron fires push | No change |
| Guest expiry | Not in V1 | Add push |
| Settlement claimed | Cron in V1 (email) | Add push |
| Reminder due | Cron in V1 | No change |
| Receipt checking | Not in V1 | **Add (required)** |

---

## State Management

### TanStack Query in Expo: Compatible, Requires Setup

**Confidence: HIGH** — Official TanStack Query docs have an Expo section; multiple production apps use this combination.

**The core issue:** TanStack Query's built-in browser focus manager and online manager do not work in React Native. You must wire these up manually using React Native APIs:

```typescript
// apps/mobile/lib/query-client.ts
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import * as Network from 'expo-network';

// Wire focus manager to app state
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

// Wire online manager to network state
Network.addNetworkStateListener(({ isConnected }) => {
  onlineManager.setOnline(isConnected ?? true);
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s (web uses 10s; mobile saves battery)
      networkMode: 'offlineFirst',
      retry: 2,
    },
  },
});
```

**Navigation-based refetch:** Unlike web where window focus triggers refetch, in Expo you need to trigger refetch on screen focus:

```typescript
// In screen components, use this pattern:
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

useFocusEffect(useCallback(() => {
  queryClient.invalidateQueries({ queryKey: ['chores'] });
}, []));
```

Or use a shared hook that wraps this pattern for every screen's primary query.

**Polling on mobile:** The web app uses 10s polling (`refetchInterval: 10_000`). On mobile, reduce to 30s or 60s, or disable polling entirely and rely on push notifications + screen focus refetch. Battery life matters.

**DevTools:** As of May 2025, there is an official TanStack Query DevTools plugin for Expo. Install `tanstack-query-dev-tools-expo-plugin` for debugging during development.

**Confirmed incompatibilities (LOW severity):**
- TanStack Query v5's `structuralSharing` works fine in Hermes (React Native's JS engine)
- No known issues with Zustand v5 co-existing with TanStack Query in Expo

### Zustand in Expo: Fully Compatible, No Gotchas

**Confidence: HIGH** — Zustand is widely used in Expo apps; no React Native-specific issues documented.

Zustand v5 works out of the box in Expo with Hermes. The theme store (`themeStore.ts`) can be used directly in the mobile app. On mobile, theme persistence uses `@react-native-async-storage/async-storage` instead of localStorage:

```typescript
// apps/mobile/lib/store/themeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useThemeStore = create(persist(
  (set) => ({ theme: 'default', setTheme: (theme) => set({ theme }) }),
  {
    name: 'roost-theme',
    storage: createJSONStorage(() => AsyncStorage),
  }
));
```

The web Zustand store does not need modification. Mobile gets its own version of the store file with the AsyncStorage adapter.

---

## Build Order (Phase Implications)

### Decisions That Must Be Made First (Before Writing Mobile UI Code)

**1. Monorepo restructuring (Week 1)**
Move `src/` to `apps/web/src/`. Extract shared packages to `packages/`. Update all import paths. This is a one-time refactor that blocks everything else. Do it first, do it once.

**2. Shared package extraction (Week 1-2)**
Pull `colors.ts`, `freeTierLimits.ts`, `time.ts`, `debtSimplification.ts`, `recurrence.ts`, `grocerySort.ts` into `packages/`. Write the API type contracts. These are the foundation mobile feature development depends on.

**3. better-auth Expo plugin (Week 2)**
Add `expo()` plugin to auth config. Add `trustedOrigins`. Build the Expo `authClient.ts`. Test the full login/signup/session flow against the Vercel staging URL. Auth is a blocker for all authenticated mobile screens.

**4. EAS Build project setup (Week 2)**
Configure EAS. Create a development build. Push notification testing requires real devices. Without this, you cannot test the full notification stack. Also required for Universal Links.

### Decisions That Can Be Deferred

**Turborepo** — Add when build times actually become painful (probably never for a solo developer at this scale)

**Offline mutations** — Defer to V3 entirely

**Receipt checking cron** — Can ship after initial mobile launch but before going to production at scale. Add in the first post-launch sprint.

**Android Universal Links / App Links** — Android ships 4-6 weeks after iOS. Do iOS Universal Links first; Android App Links can follow.

**Expo DevTools plugins** — Nice to have; not a blocker for feature development

---

## Risks

### Risk 1: better-auth Expo Cookie Issues (HIGH probability, MEDIUM impact)

There are multiple open GitHub issues (#3180, #7674, #4744) about the better-auth Expo plugin producing malformed cookies or failing on infinite `useSession` refetches under certain server configurations. The issues appear to be intermittent and environment-specific.

**Mitigation:** Test auth against production Vercel URL (not just localhost) before writing any authenticated mobile screens. If the cookie approach fails, fall back to the Bearer token plugin — it requires adding the `bearer()` plugin server-side and changing mobile API fetch headers, but no API route logic changes.

### Risk 2: NativeWind Version Fragility (MEDIUM probability, HIGH impact)

NativeWind v5 is in preview and confirmed buggy. NativeWind v4 works but targets Tailwind v3, while the web app uses Tailwind v4. This means the mobile app will use a different Tailwind version than the web app — they do not share CSS, so this is architecturally fine, but it is confusing and means you maintain two Tailwind configs.

**Mitigation:** Pin NativeWind to v4 for the V2 launch. Do not attempt to upgrade to NativeWind v5 until it is stable. The mobile UI does not need to be pixel-identical to the web UI — it needs to feel native.

### Risk 3: Monorepo Metro Bundler Complexity (LOW probability, HIGH impact)

Metro (React Native's bundler) has historically had issues with monorepos: duplicate React Native packages, symlink resolution, hoisting mismatches. Expo SDK 52+ claims automatic monorepo detection, but the documented requirement — "delete manual Metro configurations involving watchFolders" — implies older projects may have conflicts.

**Mitigation:** Start with npm workspaces (not pnpm). npm hoisting is simpler and better understood by Metro. If pnpm is used later, add `nodeLinker: hoisted` to `.npmrc`. Never have duplicate `react-native` or `react` packages in the workspace — verify with `npm ls react-native` after initial setup.

### Risk 4: Push Notification Development Friction (HIGH probability, LOW impact)

Expo Go no longer supports push notifications as of SDK 53. This means every notification-related feature requires building and deploying via EAS Build to a physical device. This is a development workflow friction point, not a production risk.

**Mitigation:** Configure EAS Build in Week 2. Accept that notification testing requires physical devices. Use Expo Go for all non-notification UI work. Budget ~1 day per notification feature for physical device testing overhead.

### Risk 5: API Type Drift (MEDIUM probability, MEDIUM impact)

Without shared API types enforced at the TypeScript level, the mobile app and API routes will gradually diverge. An API adds a required field; the mobile app continues to send requests without it; silent bugs accumulate.

**Mitigation:** The `packages/api-types/` package is non-optional. Every API response shape and request body must have a type in this package. Both the Next.js route handler and the Expo fetch call import from the same source. Make this a code review rule from day one.

### Risk 6: RevenueCat + Stripe Dual Billing (LOW probability, HIGH impact)

The project uses Stripe on web and RevenueCat on mobile. A user who subscribes on iOS (RevenueCat) and later visits the web app (Stripe) will have two separate billing records. The `households.subscription_status` column is the source of truth, but the webhook handlers for Stripe and RevenueCat must both write to it without race conditions.

**Mitigation:** The Stripe webhook handler (`/api/stripe/webhook`) already updates `subscription_status`. Add a RevenueCat webhook endpoint that does the same. Ensure the column update is idempotent (set to 'premium', never toggle). Do not let client-side RevenueCat subscription checks bypass the server-side `requirePremium()` gate.

---

*Research date: 2026-05-01. Sources: better-auth Expo integration docs, Expo monorepo docs, TanStack Query React Native docs, NativeWind v5 release notes, t3-turbo template structure, Expo push notification production guide.*
