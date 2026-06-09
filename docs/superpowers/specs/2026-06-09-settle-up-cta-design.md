# Settle Up CTA — Design Spec

**Date:** 2026-06-09
**Status:** Approved

## Problem

The prominent green "Settle up" CTA on `/money` does nothing useful in most scenarios:
- If the current user has no debts they personally owe, it navigates to the Expenses tab (feels broken).
- The full settle flow existed only through individual debt cards, not through the hero CTA.
- When user B claims they paid user A, user A has no prominent signal on `/money` to act on it.

Additionally, all four settlement actions in `SettleSheet` (claim, confirm, dispute, cancel) were missing `splitIds` in their API request bodies. This is already fixed (commit `7085dae`).

## Solution Overview

Three changes:

1. **SettlePickerSheet** — new component listing all active debts; tapping one opens `SettleSheet`
2. **Settle up CTA wiring** — opens `SettlePickerSheet` instead of the broken fallback
3. **Pending claim banner** — amber banner on `/money` when someone has claimed they paid the current user

---

## 1. SettlePickerSheet

**File:** `src/components/money/SettlePickerSheet.tsx`

A `DraggableSheet` (`featureColor="#22C55E"`) that receives the full debts list and surfaces a tappable row per debt.

**Props:**
```ts
interface Props {
  open: boolean
  onClose: () => void
  debts: DebtItem[]         // all active debts (both directions)
  currentUserId: string
  members: Member[]
  onSelect: (debt: DebtItem) => void
}
```

**Each debt row:**
- Left: `MiniAvatar` (28px) + person name
- Center: direction label — "You owe" (red-tinted) or "Owes you" (green-tinted)
- Right: bold dollar amount
- Full row is a tappable slab button; tap calls `onSelect(debt)` and `onClose()`

**Ordering:** debts where `iOwe = true` (current user owes) first, then debts where others owe the current user.

**Empty state:** not rendered — the CTA is hidden when `debts.length === 0` so the sheet is never opened empty.

---

## 2. Settle Up CTA Wiring

**File:** `src/app/(app)/money/page.tsx`

Replace the current `onClick` on the "Settle up" hero CTA:

**Before:** `onClick={() => firstOweDebt ? onOpenSettle(firstOweDebt) : onTabChange('expenses')}`

**After:** `onClick={() => setSettlePickerOpen(true)}`

Add state: `const [settlePickerOpen, setSettlePickerOpen] = useState(false)`

The CTA is already conditionally rendered — keep that condition, but the condition should now be `debts.length > 0` (any active debt, not just debts the current user owes).

Wire `SettlePickerSheet`:
```tsx
<SettlePickerSheet
  open={settlePickerOpen}
  onClose={() => setSettlePickerOpen(false)}
  debts={debts}
  currentUserId={currentUserId}
  members={members}
  onSelect={(debt) => {
    setSettlePickerOpen(false)
    onOpenSettle(debt)
  }}
/>
```

---

## 3. Pending Claim Banner

**File:** `src/app/(app)/money/page.tsx` (inline component or small extracted component)

**Trigger:** `pendingClaims` array already returned by `/api/expenses` — no new API needed. Show the banner when `pendingClaims.length > 0` and the current user is the creditor (payee) of those claims.

**Dismissal:** sessionStorage key `"roost-pending-claim-banner-dismissed"` — same pattern as `ReminderBanner`. Cleared on page mount if new claims arrive (compare count to stored dismissed count).

**Banner layout** (amber, below page header, above balance hero):
- `Clock` icon (amber)
- 1 pending claim: `"{Name} says they paid you ${amount}."`
- 2+ pending claims: `"{N} people say they paid you."`
- "Review" button (amber slab) — opens `SettleSheet` (1 claim) or `SettlePickerSheet` filtered to pending claims (2+ claims)
- `X` dismiss button (right side)

**SettlePickerSheet filtered to pending claims:** pass `debts.filter(d => pendingClaims.some(pc => pc involves d))` — specifically debts where `d.pendingClaim?.settledByPayer === true` and `d.iOwe === false`.

---

## Data Types

`DebtItem` and `Member` already exist in `SettleSheet.tsx` — `SettlePickerSheet` reuses the same interfaces. No new types needed.

`pendingClaims` is already in the API response shape consumed by the money page.

---

## Out of Scope

- Push notifications for claim events (deferred to mobile app)
- Persistent (cross-session) banner dismissal
- Email notifications
