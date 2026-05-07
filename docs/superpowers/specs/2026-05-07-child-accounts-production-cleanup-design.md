# Child Accounts + Production Cleanup — Design Spec
**Date:** 2026-05-07
**Scope:** `apps/web`

---

## Overview

Two related workstreams bundled into one implementation pass:

1. **Child account complete flow** — The add-child UI in apps/web is a placeholder stub. The full working implementation exists in the V1 root (`src/`). This spec covers porting the entire child account system to apps/web: the add-child sheet, the API routes, the child-login page, and improved discoverability in Settings.

2. **Production cleanup** — Delete a dead route, add placeholder privacy and terms pages that the homepage footer already links to.

---

## Part 1: Child Account Complete Flow

### 1A. `AddChildSheet` — Full Implementation

**File:** `apps/web/src/components/settings/AddChildSheet.tsx`

Currently a placeholder. Replace with a full 2-step form.

**Props:**
```ts
interface AddChildSheetProps {
  open: boolean
  onClose: () => void
}
```

**Step A — Form:**
- Uses `DraggableSheet` (same as all other sheets in the app)
- `featureColor`: `#3B82F6` (calendar blue — child accounts use blue per existing design)
- Sheet title: "Add Child Account" — `18px`, weight `800`, `var(--roost-text-primary)`

Fields:
- **Name** — text input, placeholder "e.g. Emma", label "Name", slab input style
- **PIN** — 4-digit numeric input, placeholder "4-digit PIN", label "PIN", `type="password"`, `inputMode="numeric"`, `maxLength={4}`. Show/hide toggle button (Eye/EyeOff Lucide icon) to the right of the input.

Below the PIN field, a muted helper: "Kids use this PIN to sign in at the child login screen. Save it somewhere — you can change it in Settings later but can't look it up."

Save button:
- Label: "Add child account"
- Style: blue slab button (`background: #3B82F6`, `border-bottom: 3px solid #1A5CB5`)
- Disabled when name is empty or PIN is not exactly 4 digits
- On submit: `POST /api/household/members/add-child` with `{ name, pin }`
- On success: advance to Step B
- On error `CHILDREN_LIMIT`: show inline error "Free plan includes 1 child account. Upgrade for more." (no upgrade sheet needed in this flow — keep it simple)
- On other errors: sonner `toast.error()`

**Step B — Success:**
- Same sheet, same title
- Show: checkmark icon (green), child's name in large text
- PIN display: show the 4 digits in a monospace pill — `font-size: 28px`, `letter-spacing: 8px`, `font-family: monospace`
- Copy button next to PIN (Clipboard icon, copies to clipboard, brief "Copied" feedback)
- Callout box (amber tint): "Save this PIN. Your child will use it to sign in. You can reset it in Settings, but you can't look it up later."
- "Done" button — closes sheet, invalidates `["members"]` query

**State reset:** Clear name + PIN inputs and return to Step A when the sheet is closed.

---

### 1B. `POST /api/household/members/add-child` Route

**File:** `apps/web/src/app/api/household/members/add-child/route.ts`

Port from V1 `src/app/api/household/members/add-child/route.ts`. Key behavior:

- Auth: `requireHouseholdAdmin()` — admin only
- Validates: `name` non-empty, `pin` exactly 4 digits (`/^\d{4}$/`)
- Free-tier check: count existing child members, return `403 { error, code: "CHILDREN_LIMIT" }` if free and already has 1 child
- Creates `user` row first (better-auth table) — FK must exist before session creation. Placeholder email: `child_${userId}@roost.internal`. `name` from input. `emailVerified: true`.
- Creates `users` row (app table) — `isChildAccount: true`, `childOfHouseholdId`, `onboardingCompleted: true`
- Hashes PIN using `hashPassword` from `better-auth/crypto`
- Creates `household_members` row: `role: "child"`, `pin` (hashed), `onboardingCompleted: true`
- Creates `member_permissions` row with child-safe defaults (all financial permissions off, always)
- Returns `{ child: { id, name }, pin }` — PIN in plain text so the UI can show it in Step B

---

### 1C. Child-Login Page

**File:** `apps/web/src/app/(auth)/child-login/page.tsx`

Port from V1 `src/app/(auth)/child-login/page.tsx`. Three-step flow:

**Step 1 — Household code:**
- Single centered column on `#FFF5F5` background
- Logo (icon only, no wordmark)
- Heading: "Hey! Enter your code."
- Subtext: "Your household code and your secret PIN."
- Large code input: `height: 64px`, `font-size: 22px`, `font-weight: 900`, `letter-spacing: 6px`, `text-transform: uppercase`
- "Continue" button — calls `GET /api/auth/child-login?householdCode=...` to load children list
- On success: persist code in a cookie (365 days) and advance to Step 2
- On load: check cookie for saved household code, pre-fill and auto-advance to Step 2 if present

**Step 2 — Name picker:**
- Grid of child name cards — each shows avatar (colored circle with initials) + name
- Tapping a card sets the selected child and advances to Step 3
- "Wrong house?" link at bottom — clears cookie, returns to Step 1

**Step 3 — PIN pad:**
- Shows selected child's name/avatar
- 4-dot display (filled red for entered digits)
- 12-key PIN pad grid (1-9, blank, 0, backspace)
- Auto-submits on 4th digit — calls `POST /api/auth/child-login`
- On success: redirect to `/today`
- On wrong PIN: shake animation on dots, clear digits, show inline error "Wrong PIN. Try again."
- No toast for wrong PIN — inline feedback only

**Styling:** Match V1 auth page style — red brand colors, slab inputs, white PIN pad buttons with `border-bottom`.

**Route:** Public (no auth required). `/child-login` is already in `PUBLIC_ROUTES` in `apps/web/src/proxy.ts` — no middleware changes needed.

---

### 1D. Child-Login API Routes

**File:** `apps/web/src/app/api/auth/child-login/route.ts`

Port from V1. Two handlers in one file:

**GET** — list child accounts for a household (public, no auth):
- Query param: `householdCode`
- Returns: `{ children: [{ id, name, avatarColor }] }`
- 404 if household code not found
- Only returns members where `role = "child"` and `deleted_at IS NULL`

**POST** — verify PIN and create session:
- Body: `{ householdCode, childId, pin }`
- Validates household code, finds child member, verifies hashed PIN using `verifyPassword` from `better-auth/crypto`
- Creates session via `auth.api.signInWithCredentials` or `internalAdapter.createSession`
- Returns session cookie and `{ success: true }`
- Returns `401` on wrong PIN with `{ error: "Invalid PIN" }` or `{ error: "No PIN set. Ask a parent to set one in Settings." }`

---

### 1E. Settings — Child Account Discoverability

**File:** `apps/web/src/app/(app)/settings/page.tsx`

The "Add Child Account" button already exists and is wired to `addChildOpen` state. Two improvements:

**1. Callout for admins with no children:**
Show a callout card above the members list when `isAdmin && !members.some(m => m.role === 'child')`:

```
[Baby icon] Add a child account
Kids get a 4-digit PIN login — no email needed and no access to finances, ever.
[Add child account →] button
```

Style: light blue tint (`#EFF6FF` background, `#BFDBFE` border), blue body text (`#1E40AF`). The button inside calls `setAddChildOpen(true)`. This callout disappears once a child exists.

**2. Child login URL hint:**
The settings page already shows the child login URL hint. Ensure it reads: "Child accounts sign in at `roost.app/child-login` using their household code and PIN."

**3. `MemberSheet` for child members:**
`apps/web/src/components/settings/MemberSheet.tsx` is currently a stub. Implement a minimal but real version for child members specifically:

- Show member name + "Child account" badge (blue)
- PIN reset section: "Reset PIN" button — admin-only, opens a nested input to set a new 4-digit PIN, calls `PATCH /api/household/members/[id]/pin`
- Remove member button: confirmation dialog, calls `DELETE /api/household/members/[id]`
- For non-child members: show name, role badge, and remove button (keep it minimal — full role/permission management is out of scope for this pass)

`PATCH /api/household/members/[id]/pin` — port from V1 `src/app/api/household/members/[id]/pin/route.ts`. Admin only, validates 4-digit PIN, hashes and saves.
`DELETE /api/household/members/[id]` — port from V1 `src/app/api/household/members/[id]/route.ts`. Admin only, cannot remove self or the admin. Soft deletes the `household_members` row.

Both routes live in `apps/web/src/app/api/household/members/[id]/` — this directory does not exist yet and must be created as part of this spec.

---

## Part 2: Production Cleanup

### 2A. Delete Dead `/food` Route

**Directory to delete:** `apps/web/src/app/(app)/food/`

This route exists but is not linked anywhere in the nav. Delete the entire directory.

Verify first: `grep -r "/food" apps/web/src` to confirm no links to it remain. If any navigation items reference it, remove those links too.

---

### 2B. Privacy and Terms Placeholder Pages

**Files:**
- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/terms/page.tsx`

Both are public pages (outside the `(app)` group, outside the `(auth)` group). No auth required.

**Layout:** Simple centered column, consistent with the homepage aesthetic.
- White background
- `RoostLogo` centered at top
- Page title: "Privacy Policy" or "Terms of Service" — Nunito 900, `#111827`
- Body: "This page is coming soon. We're working on it." — `#6B7280`, `14px`
- Back link: "Back to home" → `/`

No app shell (no nav, no sidebar). These are standalone pages.

The homepage footer already links to `/privacy` and `/terms` — once these pages exist the 404s go away.

---

## Implementation Order

1. `POST /api/household/members/add-child` route (foundation for AddChildSheet)
2. `AddChildSheet` full implementation
3. `GET/POST /api/auth/child-login` routes
4. Child-login page (`/child-login`)
5. Settings discoverability improvements (callout for admins with no children)
6. `DELETE /api/household/members/[id]` route (enables member removal in MemberSheet)
7. `PATCH /api/household/members/[id]/pin` route (enables PIN reset in MemberSheet)
8. `MemberSheet` real implementation (name, role badge, PIN reset, remove member)
9. Production cleanup: delete `/food`, add `/privacy` and `/terms`

---

## Non-goals

- Full role/permission management in MemberSheet (out of scope for this pass)
- Push notifications for child accounts (iOS app phase)
- Child account self-service PIN reset (parent resets via Settings only)
- Guest member invite flow (already exists in settings, not part of this pass)
