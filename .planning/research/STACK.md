# Stack Research: Roost V2

**Researched:** 2026-05-01
**Confidence:** MEDIUM-HIGH (web primary, Next.js/Drizzle/Neon locked by existing codebase)

---

## Recommended Stack

### Web (Existing — Next.js 16, Locked)

The web stack is not up for debate. It stays as-is:

- **Next.js 16.2.2** — App Router, React Server Components, API Routes
- **Drizzle ORM 0.45.2** + **Neon PostgreSQL** — schema-first, `db:push` migration pattern
- **better-auth 1.5.6** — sessions, email/password, child PIN login. Cannot be replaced.
- **TanStack Query 5.96.2** — 10s polling, optimistic UI
- **Zustand 5.0.12** — client-only state (theme, etc.)
- **Tailwind v4** — CSS variables, no config file
- **shadcn/ui + Lucide** — component primitives
- **Stripe 22.0.0** — web payments (Checkout, webhooks, Customer Portal)
- **Vercel** — hosting, Cron (7 jobs), HSTS

The Expo app calls the same API routes. No changes to the web API layer are needed to support mobile beyond ensuring all API routes return JSON that Expo can consume (they already do).

---

### Mobile (New — Expo)

**Use Expo SDK 53.** Do not use 54 at launch.

Rationale: SDK 53 (React Native 0.79, React 19, New Architecture on by default) is the stable current LTS. SDK 54 introduced precompiled XCFrameworks (faster iOS builds) and Liquid Glass support for iOS 26, but it is the final SDK to support Legacy Architecture with a "code freeze" note — meaning some third-party libraries may lag on SDK 54 compatibility. SDK 53 is well-tested, all key libraries (RevenueCat, AdMob) have confirmed working builds against it. Start on 53, upgrade to 54 post-launch.

**Core Expo packages:**

| Package | Purpose |
|---------|---------|
| `expo` ~53.0.x | Core SDK |
| `expo-router` ~4.x | File-based navigation (see Navigation section) |
| `expo-notifications` ~0.29.x | Push notification client |
| `expo-dev-client` | Development builds (required for all native modules) |
| `expo-constants` | App config access at runtime |
| `expo-linking` | Deep link handling |
| `expo-secure-store` | Secure token storage (auth session on device) |
| `expo-image` | Optimized image component |
| `react-native-purchases` ^8.x | RevenueCat in-app purchase |
| `react-native-purchases-ui` ^8.x | RevenueCat paywall UI |
| `react-native-google-mobile-ads` ^15.x | AdMob banners |

**Styling:**

Use **NativeWind v4** (stable, not v5 preview). NativeWind brings Tailwind class syntax to React Native. Given that the web app is already Tailwind-first, developers share the same mental model across platforms. NativeWind v4 requires the `jsxImportSource` transform (not Babel) — configure per official docs. NativeWind v5 is in preview and not recommended for a launch-timeline project.

**New Architecture:**

SDK 53 enables New Architecture (Fabric + TurboModules) by default. Do not opt out. All recommended libraries (RevenueCat, AdMob, expo-notifications) support it as of their current versions. The old Bridge architecture is scheduled for removal in RN 0.82 (SDK 55+).

---

### Navigation

**Use Expo Router v4** (ships with SDK 53 as `expo-router` ~4.x).

Expo Router is file-based routing built on top of React Navigation. It is developed by the same Expo team. For a household app with a 5-tab navigation model, Expo Router's layout system is the right choice:

```
mobile/app/
  (tabs)/
    _layout.tsx       # Tab bar config
    index.tsx         # Home/Today
    household.tsx     # Chores, Tasks, Calendar
    money.tsx         # Expenses, Grocery, Meals
    people.tsx        # Members, Settings
    more.tsx          # Notes, Reminders, Stats
  (auth)/
    login.tsx
    signup.tsx
    child-login.tsx
  onboarding.tsx
  _layout.tsx         # Root layout, auth guard
```

Expo Router gives every screen automatic deep linking (required for invite links and notification tap-through), web support if ever needed, and React Navigation primitives underneath for complex patterns like modals and sheets.

React Navigation 7 standalone is the alternative but adds manual deep-link config, TypeScript route type boilerplate, and no file-system convention. Only use bare React Navigation if you need navigation patterns that Expo Router cannot express (not the case here).

---

### Monorepo Architecture

**Recommendation: Turborepo + pnpm workspaces**

For a solo developer building Next.js + Expo in the same repo, Turborepo is the right choice over Nx. Nx adds 200+ lines of config overhead, generators, and structural opinions suited to large teams. Turborepo is 20 lines of config, task-graph caching, and gets out of your way.

**Migrate the package manager from npm to pnpm.** pnpm is required for monorepo workspaces and delivers 40% smaller `node_modules` via content-addressable storage. Vercel natively detects pnpm workspaces when `pnpm-workspace.yaml` is present at repo root.

**Directory structure:**

```
roost/                            # repo root
  apps/
    web/                          # Existing Next.js app (move everything here)
    mobile/                       # New Expo app
  packages/
    types/                        # Shared TypeScript types (no runtime code)
    api-client/                   # Shared fetch wrappers for API routes
    constants/                    # colors.ts, freeTierLimits.ts, etc.
    ui-primitives/                # (future) any cross-platform primitives
  turbo.json
  pnpm-workspace.yaml
  package.json                    # root (workspaces only, no app deps)
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": { "dependsOn": ["^build"] }
  }
}
```

**Expo Metro config** (SDK 52+): No manual `watchFolders` setup required. Metro auto-detects monorepos when using `expo/metro-config` as the base. The monorepo's `node_modules` hoisting is handled by pnpm's `nodeLinker: hoisted` setting or by leaving it default — check against Expo SDK 53 docs before finalizing.

**Vercel deployment:** Set Root Directory to `apps/web` in Vercel project settings. Vercel auto-runs `pnpm install` at repo root when it detects `pnpm-workspace.yaml`, then builds from the specified root directory.

**Migration path (npm to pnpm):**
1. Remove all `node_modules` and `package-lock.json`
2. Add `pnpm-workspace.yaml` at root
3. Move web app to `apps/web/`
4. Create `apps/mobile/` via `npx create-expo-app@latest`
5. Extract shared code to `packages/`
6. Run `pnpm install` from root

**Reference template:** `create-t3-turbo` (t3-oss/create-t3-turbo on GitHub) implements exactly this architecture with Expo + Next.js. It uses Better Auth, Drizzle, and Tailwind v4 in its 2025/2026 incarnation. Inspect it for Metro and Turborepo config patterns, but do not clone it directly — Roost's API layer is REST (not tRPC) and the auth setup is already locked.

---

### Monetization Stack

**Web:** Stripe (existing, unchanged)
**Mobile:** RevenueCat (`react-native-purchases` v8.x)
**Source of truth:** Roost's own `households.subscription_status` database column

#### Architecture

These two systems do NOT sync automatically. The correct pattern for Roost:

1. **Web purchase (Stripe):** Stripe webhook fires `checkout.session.completed` → Roost API sets `households.subscription_status = 'premium'` in Neon. This is the existing flow, already built.

2. **Mobile purchase (RevenueCat):** Configure a RevenueCat webhook (Entitlement Grant event) → Roost API endpoint receives it → sets `households.subscription_status = 'premium'`. RevenueCat webhooks POST to a URL you control.

3. **Universal check:** Every premium-gated API route calls `requirePremium()` which reads `households.subscription_status`. It does not know or care whether Stripe or RevenueCat granted premium. The DB column is the single source of truth.

4. **RevenueCat user identity:** Use the Roost `householdId` as the RevenueCat `appUserId`. This ties the RevenueCat entitlement to the household, not an individual user — matching Roost's per-household pricing model exactly.

5. **Cancellation from mobile:** RevenueCat fires a `CANCELLATION` webhook event → Roost API sets `households.premium_expires_at` to the end-of-period date → existing `requirePremium()` logic handles the grace period already.

6. **Cancellation from web (Stripe):** Existing flow unchanged. `cancel_at_period_end=true` on Stripe → webhook sets `premium_expires_at`.

#### RevenueCat Entitlement Setup

In the RevenueCat dashboard:
- Create one Entitlement: `premium`
- Create Products for iOS (App Store) and Android (Google Play) at $4.99/month
- Map both to the `premium` entitlement
- Do NOT use RevenueCat Web Billing — keep Stripe direct for web. RevenueCat Web Billing is a competing product that adds complexity and cost; the existing Stripe setup is better for web.

#### Apple's 30% Cut

Apple takes 30% on in-app purchases (15% for developers earning <$1M/year via Small Business Program). At $4.99/month, Apple gets $1.50. This is unavoidable for iOS — Stripe cannot be used for in-app digital subscriptions on iOS. After the Epic v. Apple ruling, developers can link to external purchase flows from app store apps, but only in specific regions and with full Apple approval. Do not pursue this for V2.

---

### Ad Integration

**Use Google AdMob via `react-native-google-mobile-ads` v15.x.**

For a household app with tasteful banners only, AdMob is the correct choice:

- Largest fill rate globally, household-relevant advertiser pool
- Native banner component (`BannerAd`) with configurable sizes
- Expo config plugin available (no manual native file editing)
- Compatible with Expo SDK 53 via EAS Build (not Expo Go)
- Reported iOS bug with SDK 52/53 test IDs ("network error") — this is a development-mode issue; production ads use real unit IDs and are unaffected

**Ad placement rules (per PROJECT.md):**
- Banner at bottom of main content screens only (Home, Chores, Grocery)
- Never during critical flows: onboarding, checkout, settling expenses
- Never inside sheets (DraggableSheet)
- Premium upgrade removes the ad banner component entirely — do not hide it, unmount it

**For web:** No AdSense integration in V2. Web ad revenue from a household SaaS is negligible; the upgrade path is the CTA. Revisit post-launch if traffic warrants it.

**Meta Audience Network** is an alternative but has documented Expo config plugin issues (options silently dropped per GitHub issue #828 on `react-native-google-mobile-ads`). Not recommended for V2.

**AdMob account requirements:**
- Google AdMob account (free)
- iOS: SKAdNetwork identifiers in `app.json` (config plugin handles this)
- iOS: App Tracking Transparency permission prompt (required for iOS 14.5+)
- COPPA settings if household has child users (children under 13 must receive non-personalized ads — set `requestNonPersonalizedAdsOnly: true` when `is_child_account = true`)

---

### Push Notifications

**Use Expo Push Service with `expo-notifications`.**

Do NOT build a direct APNs/FCM integration for V2. Expo Push is free, handles both iOS and Android through a single API, and the server-side code is already written (Vercel cron → `expo-server-sdk-node` → Expo Push API → APNs/FCM).

**Architecture (unchanged from V1 plan):**
- Client: `expo-notifications` gets `ExpoPushToken` on app launch
- Client: POST token to `/api/user/profile` (already has `push_token` field in schema)
- Server: Vercel cron reads `push_token` from DB, sends via `expo-server-sdk-node`
- Expo Push Service proxies to APNs (iOS) or FCM (Android) — no credential management on your side

**SDK 53 breaking change:** Push notifications no longer work in Expo Go on Android. You must use a development build (`expo-dev-client`) to test notifications. Create a development build via EAS as your standard development target, not Expo Go.

**Rate limit:** Expo Push Service allows 600 notifications/second per project. Well within range for a household app at launch. `expo-server-sdk-node` implements automatic rate limiting and retries.

**When to go direct APNs/FCM:** Only if you need features Expo Push does not support — notification categories, notification service extensions (for image attachments), or >600/s at scale. None of these apply for V2.

---

### EAS Build (CI/CD)

**Use EAS Build for all iOS and Android builds. Do not use local builds.**

Local Xcode builds are fine for debugging, but App Store submission requires consistent signing, provisioning profiles, and consistent build environments. EAS handles all of this.

**Free tier:** 15 iOS builds + 15 Android builds per month. More than sufficient for a solo developer pre-launch (expect 2-5 builds per platform per week during active development).

**Recommended workflow:**

```
Development:
  eas build --profile development --platform ios
  (Creates a .ipa with expo-dev-client installed — your daily driver)

Preview (internal testing):
  eas build --profile preview --platform all
  (Builds for TestFlight + Google Play Internal Testing)

Production:
  eas build --profile production --platform ios
  eas submit --platform ios --latest
  (Submits to App Store Connect automatically)
```

**EAS Update (OTA):** Expo SDK 53 supports over-the-air JS bundle updates via EAS Update (free up to 1,000 monthly active users). Use this for hotfixes and copy changes between native releases. Note: OTA cannot update native code (new native modules, SDK upgrades, config plugin changes require a full rebuild and App Store resubmission).

**Apple Developer Program:** Required ($99/year). There is no way around this for App Store distribution.

---

### Shared Code

The monorepo `packages/` directory is the sharing mechanism. Expo calls the same REST API routes as the web app — no shared component library or tRPC layer needed.

**What to share:**

```
packages/types/
  src/
    api.ts          # Request/response types for each API route
    domain.ts       # Shared domain types (Household, Member, Chore, etc.)
    index.ts        # Re-exports

packages/constants/
  src/
    colors.ts       # SECTION_COLORS (already exists, move here)
    limits.ts       # FREE_TIER_LIMITS (already exists, move here)
    index.ts

packages/api-client/
  src/
    client.ts       # Base fetch wrapper with auth header injection
    endpoints/
      chores.ts     # getChores(), createChore(), completeChore()
      grocery.ts
      expenses.ts
      # ... one file per domain
    index.ts
```

**What NOT to share:**
- UI components — web uses shadcn/Radix (DOM), mobile uses React Native primitives. They are different enough that sharing components adds abstraction overhead with no benefit.
- Business logic from `src/lib/utils/` — these are already DOM-free and could technically be shared, but they're simple enough to duplicate. Duplication is preferable to complex cross-platform package boundaries at this stage.

**TypeScript path aliases:**
In each app's `tsconfig.json`:
```json
{
  "paths": {
    "@roost/types": ["../../packages/types/src/index.ts"],
    "@roost/constants": ["../../packages/constants/src/index.ts"],
    "@roost/api-client": ["../../packages/api-client/src/index.ts"]
  }
}
```

Packages export raw TypeScript source (not compiled JS). Each app's build toolchain (Next.js/Webpack for web, Metro for mobile) transpiles the shared packages according to its own rules. This avoids the CJS/ESM compatibility mess.

---

## Key Library Recommendations

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `expo` | ~53.0.x | Mobile SDK base | HIGH |
| `expo-router` | ~4.x | File-based navigation | HIGH |
| `expo-notifications` | ~0.29.x | Push notification client | HIGH |
| `expo-dev-client` | latest | Development builds | HIGH |
| `expo-secure-store` | latest | Secure session token storage | HIGH |
| `react-native-purchases` | ^8.x | RevenueCat IAP | HIGH |
| `react-native-purchases-ui` | ^8.x | RevenueCat paywall UI | HIGH |
| `react-native-google-mobile-ads` | ^15.x | AdMob banner ads | MEDIUM |
| `nativewind` | ^4.x | Tailwind classes in RN | HIGH |
| `turbo` | ^2.x | Monorepo task runner | HIGH |
| `pnpm` | ^9.x | Package manager with workspaces | HIGH |
| `expo-server-sdk-node` | ^3.x | Server-side push notification sender | HIGH |
| `react-native-purchases` | ^8.x (web) | RevenueCat webhook receiver on API side | HIGH |

---

## What NOT to Use (and Why)

| Don't Use | Use Instead | Why |
|-----------|------------|-----|
| Nx | Turborepo | Nx is 10x more config for no benefit at solo-dev scale; opinionated project structure conflicts with existing layout |
| Yarn Berry (PnP) | pnpm | Yarn Plug-n-Play breaks many React Native packages; pnpm is the monorepo standard for Expo in 2025 |
| Expo Go as dev target | `expo-dev-client` EAS build | Push notifications (SDK 53+), AdMob, RevenueCat all require native code not in Expo Go. Expo Go is not a reliable test environment for Roost's feature set |
| RevenueCat Web Billing | Stripe (existing) | RevenueCat Web Billing is Stripe-backed but adds an extra layer, additional cost, and introduces RevenueCat as a new dependency for web. Stripe direct is already built and working |
| tRPC | REST API routes (existing) | Roost's API is already REST; adding tRPC requires rewriting all API routes and both clients. The shared types package achieves type-safety without tRPC |
| Solito | Expo Router | Solito is a routing abstraction over React Navigation for code sharing; Expo Router achieves the same and is maintained by Expo team |
| Direct APNs/FCM | Expo Push Service | APNs requires certificate management, FCM requires service accounts, and the server code must handle two different APIs. Expo Push is a free abstraction over both |
| Meta Audience Network | AdMob | Known Expo config plugin bugs, lower fill rate for household demographics, more complex COPPA handling |
| NativeWind v5 (preview) | NativeWind v4 | v5 is in preview as of research date; not suitable for a launch-timeline project |
| Expo SDK 54+ | Expo SDK 53 | SDK 54 introduces Liquid Glass (iOS 26 design system) and drops legacy architecture support. Third-party library compatibility (especially AdMob) is behind on SDK 54. Migrate post-launch. |

---

## Gotchas

### RevenueCat + Stripe Coexistence
- RevenueCat does not automatically know about Stripe purchases and vice versa. Roost's DB column (`households.subscription_status`) is the bridge. You must write a RevenueCat webhook handler that calls your own API, just as the Stripe webhook does. Do not skip this — without it, mobile purchases will not unlock premium on the web app.
- RevenueCat `appUserId` must be the `householdId`, not the `userId`. RevenueCat's default behavior assigns a random anonymous ID. Call `Purchases.logIn(householdId)` on app launch after the user is authenticated.
- Apple will reject an app that uses Stripe for in-app digital subscriptions. Receipt scanning, notes, recurring events — all of these are digital goods, and Apple requires IAP for them. The safest path: let RevenueCat handle the subscription; Stripe is web-only.

### Expo Go is Dead for This Project
After installing `expo-dev-client`, Expo Go should be removed from the developer's workflow entirely. AdMob, RevenueCat, and push notifications all require native code. The first EAS development build takes ~10 minutes but thereafter OTA updates via EAS Update are instant. Build the development build once and update it only when native modules change.

### AdMob App Tracking Transparency (iOS 14.5+)
You must show the ATT prompt before loading ads on iOS. Failure to do so results in AdMob showing no ads (and app store rejection). Use `expo-tracking-transparency` to request permission. For users who decline (or children), set `requestNonPersonalizedAdsOnly: true` on all ad requests.

### pnpm + Expo Metro
Expo SDK 52+ auto-detects pnpm monorepos. However, if you encounter "unable to resolve module" errors during Metro bundling, add `resolver.disableHierarchicalLookup: true` to `metro.config.js` in the mobile app. This is a known pnpm-specific Metro quirk.

### NativeWind + Tailwind v4
The web app uses Tailwind v4 (PostCSS plugin, no `tailwind.config.js`). NativeWind v4 uses Tailwind v3 under the hood with its own config. These run in parallel — NativeWind is configured in `apps/mobile/tailwind.config.js` separately from the web app's Tailwind setup. Sharing a Tailwind config across web (v4) and mobile (NativeWind v4/Tailwind v3) is not currently possible. Shared tokens (colors, spacing) must be duplicated or managed via the `packages/constants` package.

### Vercel + pnpm Monorepo Root Directory
When you set Root Directory to `apps/web` in Vercel settings, set the Install Command override to `cd ../.. && pnpm install` (or leave blank and let Vercel auto-detect). Build Command should be `cd apps/web && pnpm build` or `turbo run build --filter=web`. The key: Vercel must install at the monorepo root to resolve workspace packages, not inside `apps/web`.

### EAS Build Credits
The free tier (15 iOS + 15 Android builds/month) resets monthly. During active pre-launch development, you will likely exceed this. The Starter plan ($19/month, $45 build credits) is sufficient for a solo developer in active development. Budget for this in the launch sprint.

### Expo SDK Version Pinning
Do not let Expo upgrade automatically. Pin the SDK version in `package.json` (`expo: "~53.0.x"`) and upgrade intentionally between launches. Expo's upgrade tool (`npx expo install --fix`) resolves compatible versions of all `expo-*` packages to the pinned SDK. Run it after any intentional SDK bump.

### better-auth in Expo
`better-auth` is a Next.js/Node.js library and does not run inside React Native. The Expo app authenticates by calling the same `/api/auth/...` REST endpoints that the web app uses. Store the session token in `expo-secure-store`. The existing `/api/auth/child-login` and `/api/auth/[...all]` routes work for mobile without modification — they return JSON, not HTML redirects. The mobile app manages session state locally; there is no native `better-auth` SDK.

---

## Sources

- Expo SDK 53 Changelog: https://expo.dev/changelog/sdk-53
- Expo Monorepo Guide: https://docs.expo.dev/guides/monorepos/
- Expo Router Introduction: https://docs.expo.dev/router/introduction/
- RevenueCat Expo Installation: https://www.revenuecat.com/docs/getting-started/installation/expo
- RevenueCat Cross-Platform Subscriptions: https://www.revenuecat.com/blog/engineering/cross-platform-subscriptions-ios-android-web/
- RevenueCat Stripe Integration: https://www.revenuecat.com/docs/web/integrations/stripe
- React Native Google Mobile Ads: https://docs.page/invertase/react-native-google-mobile-ads
- AdMob SDK 52/53 iOS issue: https://github.com/invertase/react-native-google-mobile-ads/issues/742
- NativeWind Installation: https://www.nativewind.dev/docs/getting-started/installation
- Turborepo vs Nx (Nx perspective): https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo
- create-t3-turbo reference: https://github.com/t3-oss/create-t3-turbo
- Expo EAS Build Pricing: https://expo.dev/pricing
- Expo Push Notifications: https://docs.expo.dev/push-notifications/overview/
- Expo Push Service (server-side): https://docs.expo.dev/push-notifications/sending-notifications/
- Vercel Monorepo Support: https://vercel.com/docs/monorepos
- pnpm Workspaces: https://pnpm.io/workspaces
- Callstack pnpm monorepo guide: https://www.callstack.com/blog/react-native-monorepo-with-pnpm-workspaces
