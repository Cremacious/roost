# Multi-Household Switching — Design Spec

**Date:** 2026-05-07
**Status:** Approved
**App:** Roost V2 (`apps/web`)
**Module:** Household / Navigation

---

## Overview

A premium user can belong to multiple households simultaneously (as admin or member) and switch between them without logging out. The active household determines all data shown across the app. This restores a V1 capability in the V2 architecture.

---

## Current State

The V2 schema already supports multiple `household_members` rows per user. However:
- `getUserHousehold()` always returns the most recently joined household
- There is no UI or API mechanism to switch
- No free-tier enforcement on multiple households exists
- The sidebar shows no household name or switcher

---

## Feature 1: Active Household Tracking

### Schema Change — `users` table

Add one nullable column:

```ts
activeHouseholdId: text('active_household_id').references(() => households.id)
```

`NULL` means "use most recently joined" — safe default, no migration needed for existing users.

### `getUserHousehold()` Update

Located in `apps/web/src/lib/auth/helpers.ts`. Updated query logic:

1. Read `users.active_household_id` for the current user
2. If non-null, verify an active `household_members` row exists for that household (handles the case where the user was removed from the household after switching)
3. If valid, return that membership
4. Otherwise fall back to most-recently-joined (existing behaviour)

This change is transparent to every API route — they all call `getUserHousehold()` with no modification needed.

---

## Feature 2: New API Routes

### `GET /api/households`

Returns all households the current user belongs to.

```ts
// Response
{
  households: [
    {
      id: string
      name: string
      role: 'admin' | 'member' | 'guest' | 'child'
      memberCount: number
      isPremium: boolean
      isActive: boolean  // true when this === active_household_id
    }
  ]
}
```

Ordered by most recently joined. Excludes soft-deleted memberships and expired guest memberships.

### `PATCH /api/household/switch`

Sets the active household for the current user.

```ts
// Request body
{ householdId: string }

// Validations
// - Session required
// - User must have a valid, non-expired membership in householdId
// - Children cannot switch households

// On success: writes active_household_id to users table
// Response: { ok: true, household: { id, name, role } }
```

### `POST /api/household/join` — Updated

Add a free-tier limit check before inserting the new membership:

```ts
if (!isPremium) {
  const existingCount = await countUserHouseholds(userId)
  if (existingCount >= 1) {
    return 403 { error: '...', code: 'MULTIPLE_HOUSEHOLDS_PREMIUM' }
  }
}
```

Same pattern applies to `POST /api/household/create`.

---

## Feature 3: Sidebar Switcher (Desktop)

### Placement

A household block is added at the very top of the sidebar (`apps/web/src/components/layout/Sidebar.tsx`), above all nav items. It shows the active household name and a chevron.

The block is only rendered when `households.length >= 2`. Single-household users (free or premium) see a static household name label with no chevron and no interaction.

### Collapsed State

```
HOUSEHOLD
The Mackall House  ˅
```

### Expanded State (on tap)

The household name row expands inline, pushing nav items down. A dark semi-transparent dropdown panel appears beneath the name showing:

- Each household: name (bold, white) + role (muted, smaller) + green dot if active
- Active household row has `rgba(255,255,255,0.18)` background
- Inactive households: no background, slightly dimmed text
- Nav items dim to 45% opacity while the dropdown is open

At the bottom of the dropdown:
```
+ Join or create another
```
This navigates to `/onboarding` (the existing create/join flow). No new page needed.

### Interaction Rules

- Tap household name row → expand
- Tap active household → collapse (no switch)
- Tap inactive household → call `PATCH /api/household/switch`, navigate to `/dashboard`, collapse
- Tap anywhere else on the sidebar (nav items, user block) → collapse
- Click outside the sidebar → collapse

### Switching Behaviour

On tap of an inactive household:
1. Call `PATCH /api/household/switch`
2. Invalidate all TanStack Query caches (`queryClient.clear()`)
3. Navigate to `/dashboard`

The full query clear ensures no stale data from the previous household bleeds through.

---

## Feature 4: Mobile Switcher (TopBar)

The red TopBar already shows the household name on mobile. When the user has 2+ households:

- A chevron icon appears to the right of the household name
- Tapping the household name (or chevron) opens a `DraggableSheet` from the bottom

The sheet shows the same household list (name, role, green dot for active) and the "+ Join or create another" link at the bottom.

Same switching behaviour: `PATCH /api/household/switch` → `queryClient.clear()` → navigate to `/dashboard`.

When the user has only one household, the TopBar household name is non-interactive (no chevron, no tap handler).

---

## Feature 5: Premium Gating

### Rules

| Scenario | Behaviour |
|---|---|
| Free user, 1 household | Normal. No switcher shown. |
| Free user tries to join/create 2nd household | 403 `MULTIPLE_HOUSEHOLDS_PREMIUM` — invite page and join flow show premium gate |
| Premium user, 1 household | No switcher shown (nothing to switch to) |
| Premium user, 2+ households | Switcher shown in sidebar (desktop) and TopBar (mobile) |

### Error Code

`MULTIPLE_HOUSEHOLDS_PREMIUM` — maps to a `PremiumGate` with feature `"households"`. Gate copy: "You're in one home. Premium lets you belong to multiple households and switch between them instantly."

### Invite Landing Page (`/invite/[token]`)

When a free user opens an invite link and they already belong to a household, the accept button is replaced with a premium gate prompt. The invite remains valid — if they upgrade, they can return and accept it.

---

## Architecture Notes

### Files to Create

| File | Purpose |
|---|---|
| `apps/web/src/app/api/households/route.ts` | GET — list all user households |
| `apps/web/src/app/api/household/switch/route.ts` | PATCH — set active household |
| `apps/web/src/components/layout/HouseholdSwitcher.tsx` | Sidebar dropdown component |
| `apps/web/src/components/layout/HouseholdSwitcherSheet.tsx` | Mobile bottom sheet variant |

### Files to Modify

| File | Change |
|---|---|
| `apps/web/src/db/schema/users.ts` | Add `activeHouseholdId` column |
| `apps/web/scripts/add-missing-columns.ts` | Add `active_household_id` migration |
| `apps/web/src/lib/auth/helpers.ts` | Update `getUserHousehold()` to respect active selection |
| `apps/web/src/components/layout/Sidebar.tsx` | Add `HouseholdSwitcher` at top |
| `apps/web/src/components/layout/TopBar.tsx` | Make household name tappable, open sheet |
| `apps/web/src/app/api/household/join/route.ts` | Enforce free-tier household limit |
| `apps/web/src/app/api/household/create/route.ts` | Enforce free-tier household limit |
| `apps/web/src/app/invite/[token]/page.tsx` | Gate accept button for free users in 1+ household |
| `apps/web/src/lib/constants/premiumGateConfig.ts` | Add `households` feature entry |

### Data Flow on Switch

```
User taps household in dropdown
  → PATCH /api/household/switch { householdId }
    → Validate membership
    → UPDATE users SET active_household_id = householdId
    → Return { ok: true }
  → queryClient.clear()
  → router.push('/dashboard')
    → All queries re-fetch against new active household
```

---

## Out of Scope

- Notifications across households (e.g., badge counts per household in the switcher)
- Per-household notification settings
- Merging or linking households
- Viewing multiple households simultaneously
