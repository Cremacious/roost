# Settle Up CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Settle up CTA on /money open a debt picker sheet, and show an amber banner when someone has claimed they paid the current user.

**Architecture:** Three self-contained changes — (1) a new `SettlePickerSheet` component listing all active debts, (2) wiring the CTA to open it instead of the broken fallback, and (3) an inline amber banner rendered when inbound pending claims exist. No new API endpoints; all data already comes from the expenses query. The `splitIds` bug in `SettleSheet` is already fixed (commit `7085dae`).

**Tech Stack:** React, TypeScript, DraggableSheet, sonner toasts, sessionStorage for banner dismissal.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/money/SettlePickerSheet.tsx` | Create | Lists all active debts; tapping one calls `onSelect(debt)` |
| `src/app/(app)/money/page.tsx` | Modify | Wire CTA → picker; add pending claim banner |

---

### Task 1: Create SettlePickerSheet

**Files:**
- Create: `src/components/money/SettlePickerSheet.tsx`

Context: `DraggableSheet` is at `src/components/shared/DraggableSheet.tsx`. The `DebtItem` interface in `money/page.tsx` has: `from, to, amount, splitIds, iOwe?, pendingClaim?: { settledByPayer, settledByPayee } | null, toVenmoHandle?, toCashappHandle?`. Members look up names by id.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

interface DebtItem {
  from: string
  to: string
  amount: number
  splitIds: string[]
  iOwe?: boolean
  pendingClaim?: { settledByPayer: boolean; settledByPayee: boolean } | null
  toVenmoHandle?: string | null
  toCashappHandle?: string | null
}

interface Member {
  id: string
  name: string
  avatarColor?: string
}

interface Props {
  open: boolean
  onClose: () => void
  debts: DebtItem[]
  currentUserId: string
  members: Member[]
  onSelect: (debt: DebtItem) => void
}

function MiniAvatar({ name, color }: { name: string; color?: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      backgroundColor: color ?? COLOR,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: 13,
    }}>
      {name.trim().charAt(0).toUpperCase()}
    </div>
  )
}

export function SettlePickerSheet({ open, onClose, debts, currentUserId, members, onSelect }: Props) {
  const memberMap = new Map(members.map(m => [m.id, m]))

  // Debts where current user owes first, then debts where others owe current user
  const sorted = [...debts].sort((a, b) => {
    const aOwe = a.iOwe ? 0 : 1
    const bOwe = b.iOwe ? 0 : 1
    return aOwe - bOwe
  })

  return (
    <DraggableSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
          Settle up
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((debt, i) => {
            const otherId = debt.iOwe ? debt.to : debt.from
            const other = memberMap.get(otherId)
            const otherName = other?.name ?? 'Unknown'
            const iOwe = debt.iOwe

            return (
              <button
                key={`${debt.from}-${debt.to}-${i}`}
                type="button"
                onClick={() => { onSelect(debt); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                }}
              >
                <MiniAvatar name={otherName} color={other?.avatarColor} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 15, margin: 0 }}>
                    {otherName}
                  </p>
                  <p style={{
                    fontSize: 12, fontWeight: 600, margin: 0,
                    color: iOwe ? '#EF4444' : COLOR_DARK,
                  }}>
                    {iOwe ? 'You owe' : 'Owes you'}
                  </p>
                </div>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)', margin: 0 }}>
                  ${debt.amount.toFixed(2)}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </DraggableSheet>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Code\personal\roost && npx tsc --noEmit 2>&1 | grep "SettlePickerSheet" | head -10
```

Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add src/components/money/SettlePickerSheet.tsx
git commit -m "feat: add SettlePickerSheet for debt selection"
```

---

### Task 2: Wire the Settle up CTA to SettlePickerSheet

**Files:**
- Modify: `src/app/(app)/money/page.tsx`

Context:
- The main `MoneyPage` component starts around line 1549 with useState declarations.
- `settleDebt` state is at line 1551: `const [settleDebt, setSettleDebt] = useState<DebtItem | null>(null)`
- `SettleSheet` is rendered around lines 1701-1709 with `open={!!settleDebt}`.
- The "Settle up" CTA is inside the `DashboardTab` sub-component (defined inside the file) around line 289.
- `DashboardTab` receives `onOpenSettle` as a prop (passed as `onOpenSettle={setSettleDebt}` around line 1664).
- `myDebtsRaw` is destructured from the dashboard query result around line 231.
- The CTA currently reads: `onClick={() => firstOweDebt ? onOpenSettle(firstOweDebt) : onTabChange('expenses')}`
- The CTA is currently shown conditionally based on `debts.some(d => d.iOwe)` or similar.

- [ ] **Step 1: Add `settlePickerOpen` state in MoneyPage**

Find the block of useState declarations starting around line 1549. Add one new line after `settleDebt`:

```ts
const [settleDebt, setSettleDebt] = useState<DebtItem | null>(null)
const [settlePickerOpen, setSettlePickerOpen] = useState(false)   // ← add this
```

- [ ] **Step 2: Add `onOpenSettlePicker` to DashboardTab's props interface**

Find `DashboardTab`'s props interface inside the file (search for `interface DashboardTabProps` or the function signature). Add the new callback:

```ts
onOpenSettlePicker: () => void
```

- [ ] **Step 3: Update the Settle up CTA inside DashboardTab**

Find the button around line 289 with the current onClick. Replace the entire onClick:

```tsx
// Before:
onClick={() => firstOweDebt ? onOpenSettle(firstOweDebt) : onTabChange('expenses')}

// After:
onClick={() => onOpenSettlePicker()}
```

Also update the condition that shows/hides the CTA. Find wherever the CTA is conditionally rendered based on debts (e.g. `debts.some(d => d.iOwe)`). Change it to show whenever any debts exist:

```tsx
// Before (any condition that only shows on iOwe debts):
{debts.some(d => d.iOwe) && <button ...>Settle up</button>}

// After:
{debts.length > 0 && <button ...>Settle up</button>}
```

- [ ] **Step 4: Pass `onOpenSettlePicker` when rendering DashboardTab**

Find where `DashboardTab` is instantiated (around line 1664). Add the new prop:

```tsx
<DashboardTab
  ...existing props...
  onOpenSettlePicker={() => setSettlePickerOpen(true)}
/>
```

- [ ] **Step 5: Import SettlePickerSheet and render it**

Add the import near the other money component imports at the top of the file:

```tsx
import { SettlePickerSheet } from '@/components/money/SettlePickerSheet'
```

Then find where `SettleSheet` is rendered (around line 1701). Add `SettlePickerSheet` right before or after it:

```tsx
<SettlePickerSheet
  open={settlePickerOpen}
  onClose={() => setSettlePickerOpen(false)}
  debts={myDebtsRaw}
  currentUserId={currentUserId}
  members={members}
  onSelect={(debt) => {
    setSettlePickerOpen(false)
    setSettleDebt(debt)
  }}
/>
<SettleSheet
  open={!!settleDebt}
  onClose={() => setSettleDebt(null)}
  debt={settleDebt}
  currentUserId={currentUserId}
  members={members}
  payeeVenmoHandle={settleDebt?.toVenmoHandle}
  payeeCashappHandle={settleDebt?.toCashappHandle}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd C:\Code\personal\roost && npx tsc --noEmit 2>&1 | grep -E "money/page|SettlePicker" | head -20
```

Expected: no output.

- [ ] **Step 7: Manual smoke test**

Open `/money`. If any active debts exist:
- "Settle up" CTA should be visible
- Clicking it opens a sheet listing all debts
- Tapping a debt in the picker closes the picker and opens SettleSheet for that debt

- [ ] **Step 8: Commit**

```bash
git add src/app/(app)/money/page.tsx
git commit -m "feat: wire Settle up CTA to SettlePickerSheet"
```

---

### Task 3: Pending claim banner

**Files:**
- Modify: `src/app/(app)/money/page.tsx`

Context:
- `myDebtsRaw` is already available at the MoneyPage level from line 231.
- A debt has a pending inbound claim when `!debt.iOwe && debt.pendingClaim?.settledByPayer === true`. This means the other person clicked "I paid you" and the current user hasn't confirmed yet.
- `members` array is available in scope (used when rendering SettleSheet).
- `setSettleDebt` is the function that opens SettleSheet for a specific debt.
- `setSettlePickerOpen` opens the picker (added in Task 2).
- Place the banner in the MoneyPage render, above the tab content / balance hero — search for where `{tab === 'dashboard' && <DashboardTab` begins and place the banner just above it.
- Pattern reference: `src/components/shared/ReminderBanner.tsx` — uses sessionStorage dismissal with a key string.

- [ ] **Step 1: Compute pending inbound claims in MoneyPage render**

Find where `myDebtsRaw` is used in the main MoneyPage component body (after the data destructure around line 231). Add:

```ts
const pendingInboundClaims = myDebtsRaw.filter(
  d => !d.iOwe && d.pendingClaim?.settledByPayer === true
)
```

- [ ] **Step 2: Add sessionStorage dismissal state**

Add a new useState near the other state declarations (around line 1549). The dismissal key stores the dismissed count so that new claims (higher count) re-show the banner within the same session:

```ts
const [claimBannerDismissed, setClaimBannerDismissed] = useState(false)
```

Compute the show condition in render (after computing `pendingInboundClaims`):

```ts
const CLAIM_BANNER_KEY = 'roost-pending-claim-banner-dismissed'
const showClaimBanner =
  pendingInboundClaims.length > 0 &&
  !claimBannerDismissed &&
  (typeof window === 'undefined' ||
    sessionStorage.getItem(CLAIM_BANNER_KEY) !== String(pendingInboundClaims.length))
```

- [ ] **Step 3: Add dismiss handler**

Add a function in MoneyPage:

```ts
function dismissClaimBanner() {
  setClaimBannerDismissed(true)
  sessionStorage.setItem('roost-pending-claim-banner-dismissed', String(pendingInboundClaims.length))
}
```

- [ ] **Step 4: Render the banner**

Find the line where `{tab === 'dashboard' && <DashboardTab` is rendered. Insert the banner just above it:

```tsx
{showClaimBanner && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '0 0 12px 0', padding: '12px 14px',
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    border: '1.5px solid #FDE68A',
    borderBottom: '3px solid #F59E0B',
  }}>
    <Clock size={16} color="#D97706" style={{ flexShrink: 0 }} />
    <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>
      {pendingInboundClaims.length === 1
        ? (() => {
            const debt = pendingInboundClaims[0]
            const name = members.find(m => m.id === debt.from)?.name ?? 'Someone'
            return `${name} says they paid you $${debt.amount.toFixed(2)}.`
          })()
        : `${pendingInboundClaims.length} people say they paid you.`}
    </p>
    <button
      type="button"
      onClick={() => {
        if (pendingInboundClaims.length === 1) {
          setSettleDebt(pendingInboundClaims[0])
        } else {
          setSettlePickerOpen(true)
        }
      }}
      style={{
        padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12,
        backgroundColor: '#F59E0B', color: '#fff',
        border: 'none', borderBottom: '2px solid #D97706',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      Review
    </button>
    <button
      type="button"
      aria-label="Dismiss"
      onClick={dismissClaimBanner}
      style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        backgroundColor: 'transparent', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#92400E',
      }}
    >
      <X size={14} />
    </button>
  </div>
)}
```

Make sure `Clock` and `X` are imported from `lucide-react` at the top of the file. Search for the existing lucide import line and add them if missing:

```tsx
import { ..., Clock, X } from 'lucide-react'
```

- [ ] **Step 5: When picker is opened from the banner, filter to pending claims only**

The "Review" button for 2+ claims opens `SettlePickerSheet`. To show only the pending claims (not all debts), pass `pendingInboundClaims` instead of `myDebtsRaw`. The picker can be opened in two modes: all-debts (from CTA) or pending-only (from banner). Add a second state for this:

```ts
const [settlePickerDebts, setSettlePickerDebts] = useState<DebtItem[]>([])
```

Change the SettlePickerSheet render to use `settlePickerDebts` instead of `myDebtsRaw`:

```tsx
<SettlePickerSheet
  open={settlePickerOpen}
  onClose={() => setSettlePickerOpen(false)}
  debts={settlePickerDebts}
  currentUserId={currentUserId}
  members={members}
  onSelect={(debt) => {
    setSettlePickerOpen(false)
    setSettleDebt(debt)
  }}
/>
```

Update the CTA wire (from Task 2) to set `settlePickerDebts` to all debts before opening:

```tsx
// CTA:
onOpenSettlePicker={() => {
  setSettlePickerDebts(myDebtsRaw)
  setSettlePickerOpen(true)
}}
```

Update the banner "Review" button for 2+ claims:

```tsx
onClick={() => {
  if (pendingInboundClaims.length === 1) {
    setSettleDebt(pendingInboundClaims[0])
  } else {
    setSettlePickerDebts(pendingInboundClaims)
    setSettlePickerOpen(true)
  }
}}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd C:\Code\personal\roost && npx tsc --noEmit 2>&1 | grep "money/page" | head -20
```

Expected: no output.

- [ ] **Step 7: Manual smoke test**

To test the banner: open `/money` as user A when user B has already clicked "I paid you" (i.e. a `settledByPayer=true` split exists where you are the creditor).
- Amber banner should appear above the balance hero
- "Review" opens SettleSheet (1 claim) or SettlePickerSheet filtered to pending claims (2+)
- "X" dismisses the banner for the session; revisiting the page shows it again

- [ ] **Step 8: Commit**

```bash
git add src/app/(app)/money/page.tsx
git commit -m "feat: show amber banner when inbound settlement claim pending"
```
