# Phase 1 Design — V2 Shell, Onboarding, Today Dashboard

**Date:** 2026-05-05
**Phase:** 1 — Product Redesign
**Scope:** Web (primary) + Expo (end of phase)
**Approach:** Full shell with Today only — complete nav shell, stub tabs for Household/Food/Money/More, fully wired Today tab. Phase 2 fills in the other tabs.

---

## 1. Architecture

Phase 1 builds entirely inside `apps/web/src/` on top of the Phase 0 monorepo skeleton. No Drizzle schema changes — the V2 schema already has everything needed. No shared package changes.

### File structure

```
apps/web/src/
  app/
    (auth)/
      login/page.tsx              — login page (V1 split-screen layout, no redesign)
    onboarding/
      page.tsx                    — 4-step unified flow (replaces signup page)
    (app)/
      layout.tsx                  — shell: sidebar + bottom tabs + ad banner slot
      today/page.tsx              — Today dashboard, fully wired with real data
      household/page.tsx          — stub placeholder
      food/page.tsx               — stub placeholder
      money/page.tsx              — stub placeholder
      more/page.tsx               — stub placeholder
    api/
      today/route.ts              — single aggregation endpoint
      chores/[id]/complete/route.ts — inline complete (shared with chores page)
  components/
    layout/
      Sidebar.tsx                 — 180px, red background, 5 tabs, user block at bottom
      BottomNav.tsx               — mobile, 5 tabs, fixed bottom
      AdBanner.tsx                — fixed bottom mobile, 320x50, free tier only
    today/
      HeroCard.tsx                — priority-ranked hero slot
      ChoreRow.tsx                — tappable chore row with inline complete
      SnapshotStrip.tsx           — 4 tiles: tonight/money/next up/grocery
    onboarding/
      OnboardingFlow.tsx          — 4-step centered card flow
    ui/                           — V2 design system primitives (see Section 5)
  lib/
    auth/
      helpers.ts                  — requireSession, getUserHousehold
      client.ts                   — better-auth client
```

### Routing rules

- `/` — redirects to `/today` if authenticated, `/login` if not
- `/login` — public; redirects to `/today` if already signed in
- `/onboarding` — public; creates better-auth account + session in step 1, then household in step 3
- `/(app)/*` — requires auth; redirects to `/login` with `?callbackUrl` if not signed in
- Ad banner hidden on: `/onboarding`, `/login`, any open sheet, future `/settings/billing`

---

## 2. Navigation Shell

### Desktop sidebar (180px, red)

- Background: `#DC2626`
- Logo block at top: 30×30 rounded icon + "Roost" wordmark (white, Nunito 800)
- 5 nav items: Today, Household, Food, Money, More
- Active state: `rgba(255,255,255,0.22)` white frost fill, rounded-lg
- Inactive state: `rgba(255,255,255,0.6)` text, no background
- Each item: 16px Lucide icon + label (Nunito 700, 13px), 9px gap, 9px 10px padding
- User block at bottom: avatar (initials, 28px circle) + name + role, tapping navigates to settings

### Mobile bottom tab bar

- Background: white, 1px top border (`#E5E7EB`)
- Height: 52px, fixed bottom
- 5 tabs: Today (active = `#EF4444`), Household, Food, Money, More (inactive = `#9CA3AF`)
- Each tab: icon (18px) + label (7px, Nunito 800), stacked vertically
- Ad banner sits immediately above the bottom tab bar when visible

### Stub tab pages

Household, Food, Money, More each show a centered placeholder:
- Section icon (Lucide, 40px, muted color)
- Tab name (Nunito 800, 18px, `--roost-text-primary`)
- "Coming in the next update" (Nunito 600, 14px, `--roost-text-muted`)
- No button, no empty state copy — clean holding state only

---

## 3. Auth + Onboarding

### Login page

Keeps the existing V1 split-screen layout (red left panel, form right panel). No redesign in Phase 1. "Create account" link on login navigates to `/onboarding` step 1.

### Onboarding flow — 4 steps, centered card

Layout: white card, max-width 420px, centered on `#F9FAFB` background, `rounded-2xl`, slab border (`border-bottom: 4px solid #E5E7EB`). Dot progress indicator across the top of the card (4 dots: filled pill = current, smaller circle = upcoming, check = done).

**Step 1 — Account**
- Fields: name, email, password (with inline strength meter)
- CTA: "Continue" (red slab button)
- Below card: "Already have an account? Log in" link
- On submit: creates better-auth account + session, advances to step 2

**Step 2 — Your household**
- Two large tappable slab cards: "Create a household" and "Join a household"
- No text input — just pick a path
- Tapping a card immediately advances to step 3

**Step 3a — Create**
- Single input: household name
- Placeholder: "e.g. The Johnson House"
- CTA: "Create household"
- On submit: creates household + sets `onboarding_completed = true` on user, advances to step 4

**Step 3b — Join**
- Single input: 6-letter invite code
- Placeholder: "Code from your housemate"
- CTA: "Join household"
- On submit: joins household + sets `onboarding_completed = true` on user, advances to step 4

**Step 4 — You're in**
- Household name displayed large (Nunito 900, 24px)
- Single CTA: "Go to Today" (red slab button)
- No animation, no confetti — clean and fast
- Navigates to `/today`

**Time target:** Under 60 seconds from step 1 to Today dashboard.

---

## 4. Today Dashboard

### API: GET /api/today

Single aggregation endpoint. Five parallel DB queries via `Promise.all`, merged into one response. Protected route — requires session + household membership.

```typescript
// Response shape
{
  hero: {
    type: "overdue_chore" | "due_chore" | "reminder" | "all_clear"
    item: ChoreItem | ReminderItem | null
  }
  chores: ChoreItem[]        // due today + overdue, assigned to current user
  snapshot: {
    meal: { name: string } | null          // tonight's dinner slot
    money: { balance: number, label: "owed" | "owing" | "clear" }
    event: { title: string, startsAt: string } | null  // next upcoming event
    grocery: { count: number }             // items on default list
  }
}
```

### Hero slot — priority order

The hero shows exactly one item, chosen server-side by priority:

1. **Overdue chore** — a chore assigned to the current user past its due date
2. **Due today chore** — the first chore due today not yet completed
3. **Active reminder** — a reminder due today or overdue
4. **All clear** — shown when nothing is pending; green slab card, rewarding not boring

Priority is resolved in the API route. The client receives `type` and renders accordingly. The hero does not change within a page session (no live polling on the hero alone).

### Chore rows

- Shown below the hero under a colored section label: `CHORES · N DUE TODAY`
- Section label hidden entirely when `chores.length === 0`
- Each row: 22px empty circle (red border) + chore name + due label (e.g. "Overdue", "Today")
- Tapping the circle: optimistic complete (row fades + slides out via Framer Motion), POST `/api/chores/[id]/complete` fires in background
- If the completed chore was the hero item, hero upgrades to next priority on the next query refetch (10s polling interval)
- Reuses the same complete endpoint as the full chores page

### Snapshot strip

Four tiles displayed in a horizontal row (desktop) or 2×2 grid (mobile):

| Tile | Color | Content | Empty state |
|---|---|---|---|
| TONIGHT | `#F97316` | Meal name for dinner slot | "Nothing planned" |
| MONEY | `#22C55E` | "You owe $X" / "Owed $X" / "All settled" | "All settled" |
| NEXT UP | `#3B82F6` | Next calendar event title + relative time | "Nothing upcoming" |
| GROCERY | `#F59E0B` | "N items on the list" | "List is empty" |

Each tile navigates to its corresponding tab (stub in Phase 1, real page in Phase 2). No action happens inside Today except chore completion.

### Loading + empty states

- **Loading:** Skeleton cards matching the shape of hero, chore rows, and snapshot tiles. Framer Motion fade in on data arrival.
- **All clear hero:** Green slab card — checkmark icon, "You're on top of things." — rewarding, never shown as an error.
- **No chores:** Section label and rows hidden entirely — never show "CHORES · 0 DUE" with nothing below.
- **Null snapshot tile:** Muted placeholder text per tile (see table above).

---

## 5. Design System

Phase 1 establishes the V2 component primitives that every Phase 2 feature page imports. No new tokens — standardizes what V1 already used.

### Typography

- Font: Nunito via `next/font/google`, loaded once in `apps/web/src/app/layout.tsx`
- Weights used: 700, 800, 900 only. Nothing below 700 anywhere in the app.

### Color tokens

Two layers:
- **Section colors** — in `packages/constants/src/colors.ts`. Each feature section owns its color completely (chores = `#EF4444`, grocery = `#F59E0B`, calendar = `#3B82F6`, expenses = `#22C55E`, meals = `#F97316`, notes = `#A855F7`, reminders = `#06B6D4`, tasks = `#EC4899`).
- **Theme tokens** — CSS variables applied by ThemeProvider. Two themes: `default` (light) and `midnight` (dark). Variables: `--roost-bg`, `--roost-surface`, `--roost-border`, `--roost-border-bottom`, `--roost-text-primary`, `--roost-text-secondary`, `--roost-text-muted`.

### Core components

| Component | Description |
|---|---|
| `SlabCard` | Base card: `rounded-2xl`, `border 1.5px solid --roost-border`, `border-bottom 4px solid` (section or neutral color). Press: `translateY(2px)` + border-bottom reduces to 2px. |
| `Button` | Slab-style: background + `border-bottom 3px solid` (darker shade). `whileTap={{ y: 2 }}`. Variants: primary (red), section (passes color), ghost. |
| `Input` | Slab input: `border 1.5px`, `border-bottom 3px solid`, `border-radius 12px`. Font size 16px minimum (prevents iOS Safari zoom). |
| `Skeleton` | Pulse animation placeholder. Same border-radius and dimensions as the component it replaces. |
| `DraggableSheet` | Bottom sheet wrapper: shadcn Sheet (side="bottom"), colored drag handle pill, drag-to-dismiss (120px threshold), centered on desktop (max-width 680px default). |
| `AdBanner` | Fixed bottom, `height 50px`, `width 320px` centered, hidden on excluded routes and when any sheet is open. Free tier only — `isPremium` check hides it. |

### Animation presets (Framer Motion)

```typescript
// Page enter — applied to every route's top-level wrapper
{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 } }

// List stagger — applied to mapped lists
{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 },
  transition: { delay: Math.min(index * 0.04, 0.2), duration: 0.15 } }

// Press — cards and FABs
whileTap={{ y: 2 }}

// Press — small buttons
whileTap={{ y: 1 }}
```

---

## 6. Ad Banner

- **Placement:** Fixed bottom of viewport on mobile (`position: fixed, bottom: 0, left: 0, right: 0`). Sits above the bottom tab bar (tab bar has `padding-bottom` equal to banner height when visible).
- **Size:** 320×50 (standard IAB mobile banner).
- **Platform:** Mobile web only. Not shown on desktop. Not shown in Expo in Phase 1 — AdMob is Phase 3.
- **Gating:** Free tier only. Hidden when `isPremium === true`.
- **Excluded routes:** `/onboarding`, `/login`, any route with an open DraggableSheet, future `/settings/billing`.
- **Implementation:** `AdBanner` component renders a placeholder `div` in Phase 1 (no real ad network yet — AdMob wired in Phase 3). The placeholder reserves space so layout doesn't shift when ads go live.

---

## 7. Expo (Mobile)

Phase 1 ends with Expo versions of everything built on web. The API layer is identical — Expo hits the same endpoints at the production Vercel URL via a typed `api.ts` fetch wrapper.

### What's shared (zero changes)
- All API routes (`/api/today`, `/api/chores/[id]/complete`, auth)
- Business logic in `packages/utils` (time, debt, recurrence, grocery sort)
- Color constants in `packages/constants`
- DB schema and Drizzle queries

### What's different on Expo
- No Tailwind — `StyleSheet.create()` using the same token values from `packages/constants`
- No sidebar — bottom tab bar only via `expo-router` Tabs
- No ad banner in Phase 1 — AdMob is Phase 3
- Auth: `expo-secure-store` for session token persistence instead of cookies
- Navigation: `expo-router` file-based routing instead of Next.js App Router
- Sheet: `@gorhom/bottom-sheet` instead of DraggableSheet

### Expo file structure additions

```
apps/mobile/
  app/
    (tabs)/
      index.tsx           — Today screen
      household.tsx       — stub
      food.tsx            — stub
      money.tsx           — stub
      more.tsx            — stub
    (auth)/
      login.tsx
      onboarding.tsx
    _layout.tsx           — root layout, auth guard
  components/
    today/
      HeroCard.tsx
      ChoreRow.tsx
      SnapshotStrip.tsx
    shared/
      SlabCard.tsx
      Button.tsx
      Input.tsx
      Skeleton.tsx
  lib/
    auth.ts               — better-auth Expo client (expo-secure-store)
    api.ts                — typed fetch wrapper, base URL = Vercel production URL
```

### Screens that map from web

| Web route | Expo screen | Notes |
|---|---|---|
| `/today` | `(tabs)/index.tsx` | Same layout, RN primitives |
| `/login` | `(auth)/login.tsx` | Single column, no split panel |
| `/onboarding` | `(auth)/onboarding.tsx` | Same 4-step flow, KeyboardAvoidingView per step |
| `/household` (stub) | `(tabs)/household.tsx` | Same placeholder treatment |
| `/food` (stub) | `(tabs)/food.tsx` | Same placeholder treatment |
| `/money` (stub) | `(tabs)/money.tsx` | Same placeholder treatment |
| `/more` (stub) | `(tabs)/more.tsx` | Settings + profile links |
