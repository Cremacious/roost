# Expense Split Member Selection Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change expense split init functions so 3+ person households start with no members selected, while 2-person households still pre-select the only other member.

**Architecture:** Four `init*Splits` functions in `ExpenseSheet.tsx` each receive the payer ID and compute which non-payer members to pre-select. Replace the unconditional "select all" with a size check: if exactly one non-payer exists, select them; otherwise start empty.

**Tech Stack:** React (useState), TypeScript — no new dependencies.

---

### Task 1: Update all four init functions

**Files:**
- Modify: `src/components/money/ExpenseSheet.tsx`

- [ ] **Step 1: Update `initEqualSplits`**

Find this function (around line 178):

```ts
function initEqualSplits(payerId: string) {
  const others = members.filter(m => m.id !== payerId)
  setEqualSelectedIds(new Set(others.map(m => m.id)))
}
```

Replace with:

```ts
function initEqualSplits(payerId: string) {
  const others = members.filter(m => m.id !== payerId)
  setEqualSelectedIds(new Set(others.length === 1 ? others.map(m => m.id) : []))
}
```

- [ ] **Step 2: Update `initCustomSplits`**

Find this function (around line 156):

```ts
function initCustomSplits(payerId: string) {
  const nonPayer = members.filter(m => m.id !== payerId)
  setCustomSelectedIds(new Set(nonPayer.map(m => m.id)))
  const n = nonPayer.length + 1 // include payer
  const each = n > 0 && amount ? (parseFloat(amount) / n).toFixed(2) : ''
  setCustomSplits(nonPayer.map(m => ({ userId: m.id, amount: each })))
}
```

Replace with:

```ts
function initCustomSplits(payerId: string) {
  const nonPayer = members.filter(m => m.id !== payerId)
  const preselect = nonPayer.length === 1
  setCustomSelectedIds(new Set(preselect ? nonPayer.map(m => m.id) : []))
  const n = preselect ? 2 : 0
  const each = preselect && amount ? (parseFloat(amount) / n).toFixed(2) : ''
  setCustomSplits(preselect ? nonPayer.map(m => ({ userId: m.id, amount: each })) : [])
}
```

- [ ] **Step 3: Update `initPercentSplits`**

Find this function (around line 164):

```ts
function initPercentSplits(payerId: string) {
  const nonPayer = members.filter(m => m.id !== payerId)
  setPercentSelectedIds(new Set(nonPayer.map(m => m.id)))
  const n = nonPayer.length + 1 // include payer
  const each = n > 0 ? Math.round((100 / n) * 10) / 10 : 0
  setPercentSplits(nonPayer.map(m => ({ userId: m.id, percent: String(each) })))
}
```

Replace with:

```ts
function initPercentSplits(payerId: string) {
  const nonPayer = members.filter(m => m.id !== payerId)
  const preselect = nonPayer.length === 1
  setPercentSelectedIds(new Set(preselect ? nonPayer.map(m => m.id) : []))
  setPercentSplits(preselect ? nonPayer.map(m => ({ userId: m.id, percent: '50' })) : [])
}
```

- [ ] **Step 4: Update `initShareSplits`**

Find this function (around line 172):

```ts
function initShareSplits(payerId: string) {
  const nonPayer = members.filter(m => m.id !== payerId)
  setShareSelectedIds(new Set(nonPayer.map(m => m.id)))
  setShareSplits(nonPayer.map(m => ({ userId: m.id, shares: 1 })))
}
```

Replace with:

```ts
function initShareSplits(payerId: string) {
  const nonPayer = members.filter(m => m.id !== payerId)
  const preselect = nonPayer.length === 1
  setShareSelectedIds(new Set(preselect ? nonPayer.map(m => m.id) : []))
  setShareSplits(preselect ? nonPayer.map(m => ({ userId: m.id, shares: 1 })) : [])
}
```

- [ ] **Step 5: Verify the app builds without errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, build succeeds (or only pre-existing warnings).

- [ ] **Step 6: Manual smoke test**

Start the dev server if not running (`npm run dev`), go to `/money`, open Add Expense:

- With a 2-person household: switch to Equal — the other member should be pre-checked.
- With a 3+ person household: switch to Equal — no members checked. Switch to Custom $, Percent, Shares — same, nobody pre-checked.
- Change "Paid by" to another member — selection resets correctly per the same rule.

- [ ] **Step 7: Commit**

```bash
git add src/components/money/ExpenseSheet.tsx
git commit -m "fix: expense split defaults to empty for 3+ members, pre-selects for 2-person household"
```
