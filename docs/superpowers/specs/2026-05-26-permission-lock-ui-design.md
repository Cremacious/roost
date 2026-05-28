# App-Wide Permission Lock UI

Date: 2026-05-26
Status: Approved (design)

## Problem

Household permission gates already work server-side: every restricted route
calls `checkMemberPermission` and returns 403 for users who lack the permission.
But the client UI does not consistently reflect those gates. Buttons that the
caller cannot actually invoke still look fully active. A user can tap a button,
get a generic error toast from the failed request (or nothing at all), and not
understand that the restriction is a configurable household setting an admin can
change for them. Permission-restricted behavior reads as broken instead of as
intentional.

## Goals

- Every action gated by a household permission shows a visible lock icon on its
  trigger and renders in a clearly muted state.
- The locked state is the same everywhere in the app.
- Tapping a locked trigger explains the restriction with a single shared message
  pointing at admin member settings.
- The implementation is a small reusable primitive plus a documented visual
  convention, not a thicket of ad-hoc copies of the same code.

## Non-goals (out of scope)

- Changing premium gating (`PremiumGate` and its upgrade-sheet flow are
  unchanged).
- Changing the existing whole-section child blocks (e.g., the "Money stuff is
  for grown-ups" panel on `/money` for child accounts). Those keep their
  current treatment for entire sections; the lock UI handles per-action gates
  within sections the user *can* see.
- Adding new server-side permission enforcement. The server already enforces
  every gate; this is a client-side affordance pass only.
- Per-permission custom toast strings. One shared message is the convention.

## Chosen approach

A single hook `usePermissionGate` plus a visual convention every site follows.

The hook reads the canonical client-side source — `useHousehold().role` and
`useHousehold().permissions` — and returns `{ allowed, onBlocked }`. Admins
always pass. The convention says: when locked, swap the leading icon for a
`Lock` icon, apply `opacity: 0.55` and `cursor: 'not-allowed'`, set
`aria-disabled="true"`, and route the click to `onBlocked` (which fires a
`sonner` toast). The button is NOT given the HTML `disabled` attribute, so the
click still reaches the handler and the toast still fires — the user can
discover the restriction by interacting with the control.

No new wrapper component. Roost's buttons vary too much in shape (slab CTAs,
icon-only FABs, inline pencils, chip pills, quick-add inputs) for a single
wrapper to fit cleanly. A hook plus convention slots into every shape without
fighting existing styles, and the convention itself produces the consistency.

## Hook contract

```ts
// src/lib/hooks/usePermissionGate.ts

export type PermissionKey =
  | 'expenses.view' | 'expenses.add'
  | 'chores.add' | 'chores.edit'
  | 'grocery.add' | 'grocery.create_list'
  | 'calendar.add' | 'calendar.edit'
  | 'tasks.add' | 'notes.add'
  | 'meals.plan' | 'meals.suggest'

export interface PermissionGate {
  /** True if the caller may perform this action. Admins always true. */
  allowed: boolean
  /** Click handler for a locked button. Fires the shared "you don't have permission" toast. */
  onBlocked: () => void
}

export function usePermissionGate(permission: PermissionKey): PermissionGate
```

The 12 string literals match the dot-form strings returned by
`/api/household/me` and exposed via `useHousehold().permissions`. Admins
short-circuit by reading `useHousehold().role === 'admin'` and skipping the
permissions-array check (mirrors `checkMemberPermission` on the server).

## Visual convention

Apply at every locked trigger:

- **Lock icon**: Lucide `Lock`, sized to match the existing icon in that slot
  (typically 14 for inline buttons, 16-18 for primary CTAs). If the button has
  a leading icon (`Plus`, `Pencil`, `UtensilsCrossed`, etc.), the lock
  **replaces** it. For icon-only buttons (e.g., the per-chore edit pencil), the
  lock replaces the icon entirely.
- **Opacity**: `0.55` on the button as a whole. The section color underneath is
  preserved so locked controls still read as part of their section.
- **Cursor**: `cursor: 'not-allowed'`.
- **Accessibility**: `aria-disabled="true"` on the button. Do NOT use the HTML
  `disabled` attribute (it would suppress the click and prevent the toast).
- **Click**: when locked, `onClick` is `onBlocked` (the shared toast) instead of
  the normal handler.

## Toast copy (single shared string)

`toast.error("You don't have permission to do that.", { description: "Ask an admin to enable it in member settings." })`

Wording chosen because:

- It is true regardless of which permission was blocked.
- It tells the user the restriction is configurable and points at the lever
  (admin member settings).
- It avoids 12 separate per-permission strings, which would drift over time and
  add maintenance burden for marginal precision (the visual context already
  tells the user what they tried to do).

## Affected surfaces

Each of the twelve permissions has one or more specific buttons. For each, the
plan applies the hook and the convention exactly as above. The list is locked
in here so the implementation plan can decompose into per-site tasks.

| # | Permission | Affected button(s) | File |
|---|------------|---------------------|------|
| 1 | `expenses.view` | Money page content area | `src/app/(app)/money/page.tsx` |
| 2 | `expenses.add` | "Add expense" header button | `src/app/(app)/money/page.tsx` |
| 3 | `chores.add` | "Add chore" header button | `src/app/(app)/chores/page.tsx` |
| 4 | `chores.edit` | Per-row edit pencil | `src/app/(app)/chores/page.tsx` |
| 5 | `grocery.add` | Quick-add input + add button, sheet "Add" button | `src/app/(app)/lists/page.tsx` |
| 6 | `grocery.create_list` | "+ Shopping List" pill | `src/app/(app)/lists/page.tsx` |
| 7 | `calendar.add` | "Add event" trigger, DaySheet add button | `src/app/(app)/calendar/page.tsx`, `src/components/calendar/DaySheet.tsx` |
| 8 | `calendar.edit` | Per-event edit affordance in EventSheet | `src/components/calendar/EventSheet.tsx` |
| 9 | `tasks.add` | "Add task" header button | `src/app/(app)/tasks/page.tsx` |
| 10 | `notes.add` | Quick-add bar + "New note" button | `src/app/(app)/notes/page.tsx` |
| 11 | `meals.plan` | Planner slot taps, "Add meal" controls | `src/app/(app)/meals/page.tsx` |
| 12 | `meals.suggest` | "Suggest a meal" button | `src/app/(app)/meals/page.tsx` |

`expenses.view` (row 1) is a section-level gate rather than a single button. The
treatment there: when the caller lacks the permission, replace the page content
with a single empty-state panel that says "You don't have permission to view
expenses. Ask an admin in member settings." The pattern mirrors the existing
child-block on the same page (which stays for `role === 'child'`); the
permission panel runs for non-admin members whose `expenses.view` is off.

## Interactions with existing gates

- **Admins**: the hook short-circuits on `role === 'admin'`. Admins never see
  locks. Matches server-side behavior.
- **Children**: children get the lock UX on per-action gates the same way
  members do. Existing whole-section blocks remain (e.g., the money page panel
  for child accounts). On surfaces the child can see (chores, grocery, etc.)
  the lock UI handles individual restricted actions cleanly.
- **Premium gates**: `PremiumGate` is a separate system with its own upgrade
  sheet. If a button is somehow gated by both (rare — most premium-only
  features are also admin-only), the permission check wins, because no amount
  of upgrading grants a permission the household admin has explicitly disabled.
  The implementation runs the permission gate first; if it passes, the existing
  premium logic runs unchanged.

## Edge cases

- **`isLoading` from `useHousehold()`**: while loading, treat the action as
  `allowed: false` and render the lock state. This is briefly visible at most;
  preferable to allowing a click that the server would reject. The toast will
  not fire during loading because the user has no time to interact.
- **`role === 'admin'`**: always `allowed: true`, even if the permission string
  is somehow missing from the array (defense in depth).
- **`permissions` array shape**: dot-form strings (matches existing
  `/api/household/me` contract). No transformation in the hook.

## Documentation

Add a short "Permission Lock UI" subsection to `CLAUDE.md` describing the
convention so future buttons follow it without rediscovery:

- The hook lives at `src/lib/hooks/usePermissionGate.ts`.
- The convention: lock icon (Lucide `Lock`) replaces leading icon, `opacity:
  0.55`, `cursor: not-allowed`, `aria-disabled="true"`, click routes to
  `onBlocked`.
- Same toast for every gate.

## Testing

- TypeScript and ESLint stay clean across every edited file.
- Manual smoke after implementation: as a non-admin member with each of the 12
  permissions disabled in turn, every named button shows the lock + toast.
- No new automated tests. The behavior is deterministic gating over data already
  served by `/api/household/me`; the per-site changes are visual and small.
