# Welcome Popup — Design Spec
**Date:** 2026-05-07
**File:** `apps/web/src/components/shared/WelcomeModal.tsx`

---

## Overview

A one-time modal shown to new users on their first visit to `/today` after completing onboarding. Gives a quick rundown of the five things Roost does, with emphasis on inviting others and setting up child accounts (the two setup steps most new admins miss). Dismissed with a "Got it!" button that sets `has_seen_welcome = true` permanently.

---

## Trigger Condition

- Shown on `today/page.tsx` when the user profile returns `has_seen_welcome: false`
- Profile is already fetched by the today page; `has_seen_welcome` is returned by `GET /api/user/profile`
- Once dismissed, `POST /api/user/dismiss-welcome` is called — this route already exists
- A local `useState` flag (`dismissed`) controls visibility so the modal closes instantly without waiting for a refetch
- Never shown to child accounts (`is_child_account: true`) — check role from session or profile

---

## Component

**File:** `apps/web/src/components/shared/WelcomeModal.tsx`

**Type:** Client component (`'use client'`)

**Dialog library:** shadcn `Dialog` + `DialogContent` — same as used elsewhere in the app. Not a `DraggableSheet` (this is a centered modal overlay, not a bottom sheet).

**Props:**
```ts
interface WelcomeModalProps {
  open: boolean
  onDismiss: () => void
}
```

**Integration in `today/page.tsx`:**
```tsx
const [welcomeDismissed, setWelcomeDismissed] = useState(false)

// after profile loads:
const showWelcome = !welcomeDismissed && profile?.hasSeenWelcome === false

<WelcomeModal
  open={showWelcome}
  onDismiss={() => {
    setWelcomeDismissed(true)
    fetch('/api/user/dismiss-welcome', { method: 'POST' })
  }}
/>
```

The `POST` is fire-and-forget — no await, no error handling needed. Even if it fails the user won't see the modal again in this session.

---

## Layout — Option B: Red Header

**Outer container:** shadcn `DialogContent`, `max-width: 400px`, `border-radius: 20px`, `overflow: hidden`, no close X button (`hideClose`), `onInteractOutside: (e) => e.preventDefault()` (must use the button to dismiss).

**Structure (top to bottom):**

### Header block
- Background: `#EF4444`
- Padding: `24px`
- Content centered
- Logo: `<RoostLogo variant="light" size="md" />` — white version
- Title: **"Welcome to Roost"** — white, Nunito 900, 20px
- Subtitle: **"Your household, all in one place"** — white at 75% opacity, 13px, weight 600
- Margin between logo and title: `12px`

### Feature list block
- Background: white (`#ffffff`)
- Padding: `20px 24px`
- 5 rows, `gap: 14px`, `flex-direction: column`

**Each row:**
- `display: flex`, `gap: 12px`, `align-items: flex-start`
- Icon badge: `32px` rounded square, section color at 15% opacity background, Lucide icon in section color, `16px`
- Title: `13px`, weight `800`, `#111827`
- Body: `12px`, weight `600`, `#6B7280`, `margin-top: 2px`

**The 5 rows:**

| Icon | Color | Title | Body |
|---|---|---|---|
| `Users` | `#EF4444` | Invite your household | Share your code and family or roommates join instantly |
| `Baby` | `#3B82F6` | Add child accounts | Kids get a 4-digit PIN login. No email, no finance access. |
| `CheckSquare` | `#EF4444` | Chores and rewards | Assign chores, track who did what, and set up automatic rewards for kids. |
| `DollarSign` | `#22C55E` | Split expenses | Track shared bills, scan receipts, and settle up. |
| `LayoutGrid` | `#F59E0B` | Meals, grocery, calendar and more | Everything else your household needs, in one place. |

No emojis. Import icons from `lucide-react`.

### Button block
- Background: white
- Padding: `0 24px 24px`
- Single full-width button
- Label: **"Got it!"**
- Style: `background: #EF4444`, `color: #fff`, `font-weight: 800`, `font-size: 14px`, `border-radius: 12px`, `border-bottom: 3px solid #C93B3B`, `height: 48px`, `width: 100%`
- `onClick`: calls `onDismiss`

---

## Implementation Notes

- **No close button.** The user must tap "Got it!" — prevents accidental dismissal and ensures they read it.
- **Backdrop non-dismissible.** `onInteractOutside: (e) => e.preventDefault()` on `DialogContent`.
- **Font:** Nunito via `var(--font-nunito)` — already on body, will inherit.
- **No animations beyond shadcn defaults** — Dialog already has a subtle scale-in.
- **Mobile:** `DialogContent` on mobile should be nearly full-width. Use `max-w-[calc(100vw-32px)] sm:max-w-[400px]`.
- **Icon import list:** `Users`, `Baby`, `CheckSquare`, `DollarSign`, `LayoutGrid` from `lucide-react`.
- **Section colors:** import from `@/lib/constants/colors` — do not hardcode hex values for the icon badge tints.

---

## Non-goals

- No swipeable slides or multi-step flow — single screen only
- No "Skip" or close X — just the "Got it!" button
- No animation beyond the shadcn Dialog default
- Not shown on subsequent visits, even if the user clears cookies (persisted in DB)
