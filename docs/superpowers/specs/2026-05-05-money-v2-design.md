# Money V2 — Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Scope:** Full money/expenses section for the V2 Roost app. Competes with Splitwise and household budget apps. Spending-only (no income tracking).

---

## Overview

The money section replaces the V1 expenses module with a dashboard-first financial hub. It carries all V1 features (expenses, bill splitting, receipt scanning, recurring expenses, settle-up, budgets, insights, export) and adds three new capabilities: a bills tracker, savings goals, and a monthly budget overview. The result feels like Splitwise + a lightweight household budget app in one.

**Section color:** `#22C55E` (green), dark `#15803D`

---

## Navigation

Route: `/money`

Tab bar beneath the page header (scrolls horizontally on mobile):

```
Dashboard · Expenses · Bills · Budget · Goals · Insights
```

- Default tab: Dashboard
- Tab state: query param `?tab=dashboard|expenses|bills|budget|goals|insights`
- Desktop: two-column layout on the Expenses tab (340px balance column left, 1fr expense list right)
- Mobile: single column, full-width cards

**Premium gating by tab:**
| Tab | Free | Premium |
|---|---|---|
| Dashboard | Full | — |
| Expenses | Full (add, split, settle) | Receipt scanning, export, recurring |
| Bills | Full | — |
| Budget | Gate (PremiumGate trigger="page") | Full |
| Goals | 1 active goal | Unlimited goals |
| Insights | Gate (PremiumGate trigger="page") | Full |

---

## Dashboard

The `/money` default view. A single scrollable page of summary cards. Each card has a "See all" link that navigates to the relevant tab.

**Card order (top to bottom):**

### 1. Balance row (always visible)
Two slab cards side by side:
- Left: "Owed to you" — total others owe you, in green. Shows "from N people" below.
- Right: "You owe" — total you owe, in red. Shows "to [name]" if single person, "to N people" if multiple.
- If perfectly settled: single centered card "All settled" with a green checkmark.

### 2. Bills this month
Lists up to 4 upcoming/overdue bills for the current month with status badges:
- Green "Paid" — recurring draft confirmed this cycle
- Amber "Due in Xd" — due date within 7 days, draft not confirmed
- Red "Overdue" — due date passed, draft not confirmed
- Gray "Upcoming" — due date more than 7 days away

Shows monthly total: "May bills — $2,340 total · $1,200 paid · $1,140 remaining"

Only shown if at least one bill exists.

### 3. Budget health
Shows the total monthly budget bar (all category caps summed) with spend vs. remaining.
Below the bar: up to 3 category chips showing only categories above 70% of their cap (amber) or over budget (red). If all are under 70%, shows a single "All on track" green chip.

Only shown if at least one budget category is configured. Free users see a premium upsell card instead.

### 4. Savings goal
Shows the single active goal with the nearest target date (or highest progress if no dates set). Progress bar in purple. "Name · $X / $Y · N days left"

If multiple goals: "Beach vacation · $640/$2,000 · +2 more goals →"

Only shown if at least one active goal exists. Free users with no goals see a "Start saving together" premium upsell CTA (PremiumGate trigger="inline" feature="goals").

### 5. Recent expenses
Last 5 expenses. Each row shows:
- Title + category + who paid + relative time
- Your net position on the right: green "+$X back" if you paid and others owe you, red "-$X you owe" if someone else paid and you owe them, gray "Settled" if resolved

"See all →" links to the Expenses tab.

### 6. Add expense FAB
Green slab button at the bottom: "+ Add expense". Opens ExpenseSheet.

---

## Expenses Tab

Carries all V1 expense features. New additions:

### Inline share on every row
Every expense row in the list shows the user's net position in color — no tapping in required:
- `+$43.50 back` (green) — you paid, others owe you this amount
- `-$31.00 you owe` (red) — someone else paid, you owe this
- `Settled` (gray) — split is resolved

### Cleaner receipt scanning
After scanning, line items can be assigned to specific members (not just split equally). The line item editor shows each item with a member selector. Items with no selection are split equally. This replaces the V1 flow which was clunky.

### Everything else from V1 (unchanged)
- Add expense: title, amount, paid_by, category, notes
- Split methods: Equal / Custom amounts / Payer only
- Two-sided settle-up: debtor claims paid → creditor confirms or disputes
- Debt simplification algorithm (net balances, greedy creditor/debtor matching)
- Recurring expense templates with draft-confirm-skip flow
- Export CSV / PDF (date range + quick-range pills)
- Settlement reminders cron (daily, rate-limited per split)
- Expense categories: 10 defaults, admin can create custom

---

## Bills Tab

Surfaces all recurring expenses flagged as bills, organized by due date within the current month.

### Bills board layout
- Header: "May — $2,340 total · $1,200 paid · $1,140 remaining"
- Bills listed in ascending due-day order
- Each bill row: name, due day, amount, split summary, status badge
- Status logic:
  - **Paid** — recurring draft was confirmed this cycle
  - **Due in Xd** — draft not confirmed, due date within 7 days
  - **Overdue** — due date passed, draft still pending or not created
  - **Upcoming** — due date more than 7 days away

### Marking a recurring expense as a bill
In the recurring expense create/edit sheet (RecurringExpenseSheet or EditRecurringSheet), add:
- "This is a household bill" toggle
- When enabled: "Due day of month" number input (1–31)

### Bill alerts
- Dashboard card shows amber warning chip when any bill is due within 3 days and not confirmed
- Overdue bills show a red dot badge on the Bills tab label

### What bills does not do
- No bank/bill-pay integration
- No variable amount prediction (user enters amount each cycle when confirming the draft)

---

## Budget Tab

Per-category monthly spending caps with a household-level total. Premium only.

### Layout

**Top: monthly total bar**
- Label: "May budget"
- Single progress bar, color shifts green → amber (70%) → red (100%)
- "X spent · Y remaining of Z budgeted"

**Per-category rows**
Each row: category icon + name, progress bar, "X / Y" spend vs cap, status chip.
- Green "On track" — below 70%
- Amber "Watch it" — 70–90%
- Red "Over budget" — above 100%
- Tap any row → filters Expenses tab to that category

**Total budget** = sum of all category caps. Categories without a cap are excluded from the total.

**Budget reset** — 1st of each month (no rollover).

**Add/edit budget** — admin only. Icon-only button in header opens a simple sheet: category picker, monthly cap input.

---

## Goals Tab

Household savings goals. Members log contributions toward a shared target.

### Goals list
Active goals as slab cards, each showing:
- Name + optional description
- Progress bar (purple, `#8B5CF6`)
- "$X saved of $Y · N days left" (days left only if target date set)
- Row of member avatars with individual contribution amounts on hover/tap
- "Contribute" button (any member)
- Edit/delete buttons (admin only)

Completed goals collapse into a "Completed" section below, sorted by completion date descending.

### Create/edit goal (GoalSheet — admin only)
Fields: name, target amount, target date (optional), description (optional).

### Contribute (ContributeSheet — any member)
Fields: amount, optional note. Goal selector if multiple active goals.

Contributions are not expenses — they have no effect on member balances or splitting. They are a separate ledger purely for goal tracking.

### Goal breakdown
Tapping a goal opens a GoalDetailSheet showing each member's total contributions as a ranked list with amounts.

### Premium gating
- Free tier: 1 active goal maximum. Creating a second shows `MULTIPLE_GOALS_PREMIUM` gate.
- Completed goals don't count toward the limit.

---

## Insights Tab

Spending analytics for the household. Premium only.

### Date range
Presets at top: This month / Last 3 months / Last 6 months / This year / Custom (date range picker). Same pattern as the Stats page.

### Four views (stacked, scrollable)

**1. Spending over time** (Recharts AreaChart)
Monthly spend totals for the selected period. Tap a month bar to filter the expense list on the Expenses tab to that month.

**2. Spending by category** (Recharts DonutChart)
Percentage of total spend per category. Uses the same category colors as the budget section.

**3. Who paid vs fair share** (Recharts HorizontalBarChart)
For each member: total paid vs their fair share (total household spend / members). A member consistently to the right of their fair share line is fronting costs. Most useful insight for multi-person households.

**4. Largest expenses** (list, no chart)
Top 10 single expenses in the selected period. Shows title, category badge, who paid, amount. Sorted by amount descending.

---

## Schema

### New tables

```sql
savings_goals
  id              text primary key
  household_id    text not null  references households
  name            text not null
  target_amount   numeric(10,2) not null
  target_date     date
  completed_at    timestamp
  created_by      text not null  references users
  created_at      timestamp default now()
  deleted_at      timestamp

goal_contributions
  id              text primary key
  goal_id         text not null  references savings_goals
  household_id    text not null  references households
  user_id         text not null  references users
  amount          numeric(10,2) not null
  note            text
  created_at      timestamp default now()
```

### Modified tables

```sql
-- recurring_expenses: add two columns
is_bill          boolean not null default false
due_day          integer           -- 1–31, nullable, only relevant when is_bill=true
```

All other expense schema (expenses, expense_splits, expense_categories, recurring_expenses base columns) carries from V1 unchanged.

---

## API Routes

### New routes

```
GET    /api/money/dashboard          Single endpoint returning all dashboard card data:
                                     balances, bills (up to 4), budget summary,
                                     active goal, recent expenses (5). One DB round-trip
                                     fan-out with Promise.all.

GET    /api/money/bills              All recurring expenses where is_bill=true for the
                                     current month, with computed status (paid/due/overdue/
                                     upcoming) based on is_recurring_draft and due_day.

GET    /api/money/goals              List active + completed goals with contribution totals
                                     per member.
POST   /api/money/goals              Create goal (admin only).
PATCH  /api/money/goals/[id]         Edit or mark complete (admin only).
DELETE /api/money/goals/[id]         Soft delete (admin only).

POST   /api/money/goals/[id]/contribute   Log a contribution (any member). Validates
                                           amount > 0, goal exists and not completed.
GET    /api/money/goals/[id]/contributions Per-member contribution breakdown.

GET    /api/money/insights           Charts data. Accepts ?from=&to= ISO date params.
                                     Returns: spendingOverTime[], byCategory[],
                                     byMember[], largestExpenses[].
```

### Carried from V1 (same logic, same routes)

```
GET/POST         /api/expenses
PATCH/DELETE     /api/expenses/[id]
POST             /api/expenses/[id]/settle
POST             /api/expenses/scan
GET              /api/expenses/export
GET              /api/expenses/export/preview
POST             /api/expenses/settle-all/claim
POST             /api/expenses/settle-all/confirm
POST             /api/expenses/settle-all/dispute
POST             /api/expenses/settle-all/cancel
POST             /api/expenses/settle-all/remind
GET/POST         /api/expenses/recurring
PATCH/DELETE     /api/expenses/recurring/[id]
POST             /api/expenses/recurring/[id]/post
POST             /api/expenses/recurring/[id]/skip
GET/POST         /api/expenses/categories
POST             /api/expenses/categories/suggest
PATCH/DELETE     /api/expenses/categories/[id]
GET/POST         /api/expenses/budgets
PATCH/DELETE     /api/expenses/budgets/[id]
GET              /api/expenses/insights  (deprecated — replaced by /api/money/insights, do not implement)
GET              /api/cron/recurring-expenses
GET              /api/cron/settlement-reminders
```

---

## Components

### New components

```
src/app/(app)/money/page.tsx               Tab shell + query param routing
src/app/(app)/money/dashboard/page.tsx     Dashboard tab
src/app/(app)/money/expenses/page.tsx      Expenses tab (wraps V1 expense list)
src/app/(app)/money/bills/page.tsx         Bills tab
src/app/(app)/money/budget/page.tsx        Budget tab (premium gate)
src/app/(app)/money/goals/page.tsx         Goals tab
src/app/(app)/money/insights/page.tsx      Insights tab (premium gate)

src/components/money/GoalSheet.tsx         Create/edit goal (admin)
src/components/money/GoalDetailSheet.tsx   Per-member contribution breakdown for a goal
src/components/money/ContributeSheet.tsx   Log contribution (any member)
src/components/money/BillRow.tsx           Single bill row with status badge
src/components/money/BudgetCategoryRow.tsx Single budget row with progress bar
```

### Carried from V1 (move from src/components/expenses/ to src/components/money/)

```
ExpenseSheet.tsx        + inline share display improvement
SettleSheet.tsx
RecurringDraftSheet.tsx + isBill/dueDay fields
EditRecurringSheet.tsx  + isBill/dueDay fields
ExportSheet.tsx
ReceiptScanner.tsx
LineItemEditor.tsx      + cleaner per-person line item assignment
CategoryPicker.tsx
```

---

## Premium Error Codes

```
BUDGET_PREMIUM           — accessing budget tab without premium
GOALS_PREMIUM            — accessing goals tab without premium (future-proofing)
MULTIPLE_GOALS_PREMIUM   — creating a 2nd active goal on free tier
INSIGHTS_PREMIUM         — accessing insights tab without premium
```

Existing codes retained: `RECEIPT_SCANNING_PREMIUM`, `EXPORT_PREMIUM`, `RECURRING_EXPENSES_PREMIUM`

---

## Cron Jobs (unchanged from V1)

- `/api/cron/recurring-expenses` — daily 8am UTC, creates drafts for due templates, notifies admins
- `/api/cron/settlement-reminders` — daily 10am UTC, reminds payees of claims older than 7 days

---

## Out of Scope

- Income tracking / budget allocation from income
- Bank account integration / Plaid
- Bill pay (no payment initiation)
- Variable amount prediction for utility bills
- Individual (non-household) finance tracking
- Currency conversion
- Tax categorization

---

## Competitive Positioning

| Feature | Roost | Splitwise | Monarch | YNAB |
|---|---|---|---|---|
| Household splitting | Yes | Yes | No | No |
| Receipt scanning | Yes | No | No | No |
| Bills tracker | Yes | No | No | Yes |
| Household budget | Yes | No | Yes | Yes |
| Savings goals | Yes | No | No | Yes |
| Spending insights | Yes | No | Yes | Yes |
| Household-first | Yes | Partial | No | No |
| Zero operating cost | Yes | No | No | No |
