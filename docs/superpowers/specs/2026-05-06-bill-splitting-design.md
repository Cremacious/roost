# Bill Splitting — Competitive Feature Design

**Date:** 2026-05-06
**Status:** Approved
**App:** Roost V2 (`apps/web`)
**Module:** Money (`/money`)

---

## Overview

Roost's bill splitting must outcompete Splitwise for the household use case. Splitwise charges $4/person/month and lacks receipt scanning, recurring bills, budget tracking, and two-sided settlement confirmation. Roost charges $5/household/month and already wins on those dimensions.

This spec closes the remaining gaps and adds one signature feature — receipt scanning with item-level assignment — that no competitor currently has.

---

## Competitive Position After This Spec

| Feature | Splitwise | Roost (after) |
|---|---|---|
| Receipt scanning + OCR | No | Yes (75 free/month) |
| Item-level assignment (grid matrix) | No | Yes |
| Percentage splits | Yes | Yes |
| Share-based splits | No | Yes |
| Split templates | No | Yes |
| Debt simplification | Pro only | Free |
| Two-sided settle confirmation | No | Yes |
| Payment deep links (Venmo, Cash App) | Pro only | Yes |
| Recurring bills | No | Yes |
| Budget tracking | No | Yes |
| Pricing | $4/person/mo | $5/household/mo |

---

## Feature 1: Receipt Scanning with Item-Level Assignment

### Entry Point

The existing ExpenseSheet keeps its current form structure. At the very top — above the description field — a single green dashed banner reads **"Scan receipt to auto-fill"** with a camera icon and "75 free scans/month" caption. Tapping it launches the scan flow. Ignoring it and typing manually works exactly as before.

### Full Flow

**Step 1 — Camera or file picker**
On mobile: native camera sheet (`capture="environment"`). On desktop: file picker. Image sent as base64 to `POST /api/expenses/scan` via Azure Document Intelligence prebuilt-receipt model. A photo tips overlay shows once per session (good lighting, angle above receipt, flat dark surface, full receipt in frame). Dismissing tips auto-triggers the input.

**Step 2 — Scanning state**
Animated spinner with "Reading your receipt..." text. Two failure states:
- Network error / bad image: error state with "Try again" and "Enter manually" buttons.
- OCR worked but 0 items detected: amber warning state with "Add items manually" — not an error, still valid.

**Step 3 — Review and edit line items**
OCR results shown as an editable list. Each row: item name (editable inline) + amount (editable inline). Users can delete spurious rows, fix OCR errors, and add missing items. Tax and tip appear as separate pre-labelled rows at the bottom. The merchant name pre-fills the description field automatically.

An "Add items manually" link on this screen skips scanning entirely and opens an empty editable list — for crumpled or unreadable receipts.

**Step 4 — Grid assignment**
Items as rows, household members as columns. See Grid Assignment section below.

**Step 5 — Auto-fill expense form**
Confirming the grid pre-fills the ExpenseSheet: merchant name as description, receipt total as amount, custom splits as exact dollar amounts per person. The user reviews the filled form (can still edit title, paid-by, category), then saves normally. Receipt line items stored as JSON in `expense.receipt_data` for reference in the expense detail view.

---

## Feature 2: Grid Assignment Screen

The centerpiece of the receipt flow. Shown as a scrollable table.

### Layout

- **Rows:** Line items (name + amount)
- **Columns:** Household members (avatar + first name)
- **Footer row (sticky):** Live totals per person, updates on every tap
- **Item name column:** Sticky-left when scrolling horizontally (5+ members)

### Interaction Rules

**Assign / unassign:** Tap any cell to toggle. Empty → green filled (assigned). Green → empty (unassigned). No confirmation needed.

**Shared items:** Two or more green cells in the same row = shared item. Amount divides equally among assigned members. A "shared" badge appears on the item name. Per-person amount shown inline: "$9.99 · $5.00 each".

**Tax + tip row:** Always locked to all members, equal split. Cells render as a dash (not a checkbox). Cannot be changed. This keeps the UI simple for the 95% case where equal tax/tip is correct.

**Unassigned items:** Row turns amber with dashed cell borders. An "unassigned" badge appears on the item name. The Confirm button is disabled while any items remain unassigned. An amber count banner at the bottom shows how many remain; tapping it scrolls to the first unassigned row.

**Edit item name/amount:** Long-press (mobile) or double-click (desktop) any item row to edit name or amount inline. Handles OCR errors without leaving the screen.

**Many members (5+):** Table scrolls horizontally. Member columns are fixed 44px wide. Item name column stays sticky.

### Data Model

Each assigned item becomes a `lineItem` in `expense.receipt_data`:
```json
{
  "merchant": "Olive Garden",
  "total": 84.20,
  "lineItems": [
    { "name": "Fettuccine Alfredo", "amount": 18.99, "assignedTo": ["user-id-chris"] },
    { "name": "Tiramisu", "amount": 9.99, "assignedTo": ["user-id-chris", "user-id-sam"] }
  ],
  "taxAndTip": 27.23
}
```

The item assignments are converted to `expenseSplits` rows (exact dollar amounts per person) before saving. The `receipt_data` JSON is stored for display in the expense detail view.

---

## Feature 3: Additional Split Methods

The existing split pills in ExpenseSheet (`Equal`, `Custom $`, `Just me`) are extended with two new methods and a templates system. All five methods live as pills:

**Equal** — divide total evenly. Existing behaviour, unchanged.

**Custom $** — type exact dollar amount per person. Must sum to total. Existing behaviour, unchanged.

**% (Percentage)** — type a percentage per person. Dollar amount shown live next to each input. A progress bar below the member list shows 0–100% filled, turns green when balanced at 100%. Cannot save until percentages sum to exactly 100%.

**Shares** — tap +/- stepper per person to set a multiplier (1×, 2×, 3×). Dollar amount auto-calculated based on share count. Shown as "3 total shares · $40.00 per share". Good for scenarios like "Chris has the bigger room, pays 2× Sam".

**Just me** — payer pays all, no split. Existing behaviour, unchanged.

### Split Templates

Any saved split configuration becomes a named template, applied with one tap on future expenses.

- **Save:** A "Save as template" checkbox appears below the member list when using %, Custom $, or Shares methods. Checking it prompts for a name (e.g. "Rent split").
- **Apply:** A "Saved templates" section appears at the top of the split area (collapsed by default, expands on tap). Each template shows name and a summary of the split (e.g. "Chris 60% · Alex 40%"). Tapping "Apply" fills the current split inputs instantly.
- **Manage:** Templates listed in Settings under a new "Split Templates" row. Admin can delete any template; members can delete their own.
- **Storage:** Templates stored per-household in a new `split_templates` table: `id`, `household_id`, `created_by`, `name`, `method` (equal/percent/shares/custom), `splits` (JSON array of `{ userId, value }`), `created_at`.

---

## Feature 4: Payment Deep Links

### In SettleSheet — Debtor View

After the existing debt summary ("You owe $47.30 to Chris"), a **"Pay via"** section shows one button per payment app that the payee has configured in their profile. Buttons appear only when the payee has set a handle — no handle, no button.

**Venmo:** `venmo://paycharge?txn=pay&recipients=<handle>&amount=<amount>&note=Roost+expense`
Opens Venmo pre-filled with payee handle, amount, and "Roost expense" note.

**Cash App:** `cashme://cash.app/$<cashtag>/<amount>`
Opens Cash App pre-filled with cashtag and amount.

**Zelle:** `zelle://send?amount=<amount>` (Zelle does not support pre-filling recipient via URL scheme)
Copies amount to clipboard, opens Zelle. Button label: "Pay with Zelle (amount copied)".

Tapping any payment app button does not skip the two-sided confirmation flow. After returning to Roost the debtor still taps "Mark as paid" to trigger the claim, which the payee confirms. This keeps the audit trail intact.

### Profile Settings — Payment Handles

A new "Payment handles" section in Settings > Profile. Two optional fields: Venmo username, Cash App $cashtag. These are visible to household members only (not public). Users who set no handles see no payment buttons in SettleSheet — the existing "Mark as paid" flow is the only option.

---

## Architecture Notes

### New DB Table: `split_templates`

```sql
split_templates (
  id          text primary key,
  household_id text not null references households(id),
  created_by  text not null references users(id),
  name        text not null,
  method      text not null,  -- 'percent' | 'shares' | 'custom'
  splits      text not null,  -- JSON: [{ userId, value }]
  created_at  timestamp default now()
)
```

### Schema Additions to `users`

Two nullable text columns: `venmo_handle`, `cashapp_handle`. Added to the existing users table, surfaced in `GET /api/user/profile` and `PATCH /api/user/profile`.

### API Changes

| Route | Change |
|---|---|
| `POST /api/expenses/scan` | Already exists in V1. Port to V2 with Azure Document Intelligence. |
| `GET /api/expenses/categories` | Already exists. |
| `GET /api/split-templates` | New. List templates for current household. |
| `POST /api/split-templates` | New. Create template. |
| `DELETE /api/split-templates/[id]` | New. Delete template (creator or admin). |
| `PATCH /api/user/profile` | Extended to accept `venmoHandle`, `cashappHandle`. |

### Premium Gating

- Receipt scanning: 75 scans/month free (hidden cap via `receiptScanUsage` table). Unlimited on premium. This is V2's policy (more generous than V1's premium-only).
- Split templates: Free. No gate — this is a basic quality-of-life feature.
- % and Shares splits: Free. No gate.
- Payment deep links: Free. No gate.

---

## Out of Scope

- In-app payments (Venmo/PayPal API integration). Roost never processes money.
- Friends outside the household. Deliberate tradeoff — Roost is household-scoped.
- Multiple currencies. Out of scope for V2 launch.
- Export (CSV/PDF). Separate feature, not part of this spec.
- Expense comments/notes thread. Separate feature.
