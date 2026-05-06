# Money V2 — Implementation Plan

**Date:** 2026-05-05
**Status:** Ready
**Design spec:** `docs/superpowers/specs/2026-05-05-money-v2-design.md`
**Route:** `/money` (replaces `/expenses`)
**Section color:** `#22C55E` / dark `#15803D`

---

## Approach

Build the money section in 14 sequential tasks, ordered by dependency. Schema and API routes first, then UI from the inside out (sheets before pages, pages before dashboard). Each task is independently shippable and testable before the next begins.

All components go in `src/components/money/`. All API routes go under `/api/money/` for new endpoints; V1 expense routes are rebuilt at `/api/expenses/` with the same paths. Page files go in `src/app/(app)/money/`.

---

## Task 1: Schema + Migration

**Goal:** All new tables exist in Neon. No UI yet.

### Deliverables

**New tables:**
```sql
savings_goals
  id              text primary key default cuid()
  household_id    text not null references households(id)
  name            text not null
  target_amount   numeric(10,2) not null
  target_date     date
  completed_at    timestamp
  created_by      text not null references users(id)
  created_at      timestamp not null default now()
  deleted_at      timestamp

goal_contributions
  id              text primary key default cuid()
  goal_id         text not null references savings_goals(id)
  household_id    text not null references households(id)
  user_id         text not null references users(id)
  amount          numeric(10,2) not null
  note            text
  created_at      timestamp not null default now()
```

**Schema modifications:**
```sql
-- Add to recurring_expenses table:
is_bill   boolean not null default false
due_day   integer  -- 1–31, nullable
```

**All other tables** (expenses, expense_splits, expense_categories, recurring_expenses base columns, expense_budgets) are rebuilt from the V1 schema verbatim — copy column definitions, do not change column names or types.

Run `npm run db:push` after all schema changes.

### Acceptance criteria
- `npm run db:push` completes without error
- `savings_goals` and `goal_contributions` tables exist in Neon with correct columns
- `recurring_expenses` has `is_bill` and `due_day` columns
- All V1 expense tables exist with correct camelCase column names (Drizzle V2 style)

---

## Task 2: Core Expense API Routes

**Goal:** GET/POST/PATCH/DELETE for expenses work. Balances and debt simplification work.

### Deliverables

Rebuild these routes (logic identical to V1, verify against V1 source):

```
GET  /api/expenses           — list expenses for household month, with splits + attendees
                               Returns: expenses[], debts[], myBalance, totalSpentThisMonth,
                               pendingClaims[], isPremium, recurringDrafts[]
POST /api/expenses           — create expense + splits. Validates: title, amount > 0,
                               attendeeIds non-empty, split amounts sum to total
PATCH /api/expenses/[id]     — edit title + category (amount locked after creation)
DELETE /api/expenses/[id]    — soft delete (creator or admin only)
```

**Debt simplification** — re-implement `simplifyDebts(splits[])` utility in `src/lib/utils/debtSimplification.ts`:
- Compute net balance per person
- Greedy matching: largest creditor + largest debtor cancel first
- Returns `DebtItem[]` — { fromUserId, toUserId, amount }

**getUserHousehold** — import from chores route or extract to `src/lib/auth/helpers.ts`.

### Acceptance criteria
- `POST /api/expenses` creates an expense with correct splits
- `GET /api/expenses` returns debts[] with correctly simplified amounts
- `myBalance` is positive when owed money, negative when owing
- Soft delete sets `deleted_at`, row excluded from GET

---

## Task 3: ExpenseSheet + Expense List Page

**Goal:** Users can add, view, and delete expenses. Inline share shown on each row.

### Deliverables

**`src/components/money/ExpenseSheet.tsx`**
Props: `open`, `onClose`, `expense?` (edit mode), `members[]`, `isPremium`, `onUpgradeRequired?`

Fields:
- Title (text input)
- Amount (numeric input — disabled in edit mode)
- Paid by (member select)
- Category (CategoryPicker — locked for free users)
- Split method toggle: Equal / Custom / Just me
  - Equal: auto-divides among selected members
  - Custom: per-member amount inputs that must sum to total
  - Just me: payer pays all, no splits recorded
- Notes (optional textarea)
- Repeat toggle (locked for free — opens recurring flow, Task 6)
- Save / Delete buttons

**Inline share on expense rows:**
Each row in the expense list shows the user's net position:
- Green `+$X.XX back` — user paid, others owe them this net amount
- Red `-$X.XX you owe` — someone else paid, user owes this net amount
- Gray `Settled` — all splits for this expense are settled

**`src/app/(app)/money/expenses/page.tsx`**
- Desktop: two-column layout (340px left: balance hero + debt cards, 1fr right: expense list)
- Mobile: balance chips strip at top (scrollable), then expense list
- Balance hero shows myBalance (green if positive, red if negative)
- Debt cards: one per person you owe or who owes you, with settle button
- FAB: green "+ Add expense" opens ExpenseSheet

### Acceptance criteria
- Can add an expense with equal split among 3 members — each split row created correctly
- Custom split with amounts that don't sum to total shows validation error
- Expense rows show correct inline share for the logged-in user
- Edit mode pre-fills all fields, amount input is disabled

---

## Task 4: Settle-Up Flow

**Goal:** Two-sided settlement — debtor claims, creditor confirms or disputes.

### Deliverables

Rebuild V1 settle-up routes verbatim:
```
POST /api/expenses/settle-all/claim    — debtor marks they paid creditor
POST /api/expenses/settle-all/confirm  — creditor confirms, sets settled=true
POST /api/expenses/settle-all/dispute  — creditor disputes, resets settled_by_payer
POST /api/expenses/settle-all/cancel   — debtor cancels pending claim
POST /api/expenses/settle-all/remind   — send reminder (rate-limited: 1/24h per split)
```

**`src/components/money/SettleSheet.tsx`**
Three modes driven by split state:
- `fresh` — "I paid [name] $X" confirm button
- `i_claimed` — "Waiting for confirmation" + Cancel + Remind links
- `they_claimed` — "Confirm received" green button + Dispute link

DebtCard states:
- Payer-pending: amber border-bottom, 65% opacity, "Awaiting confirmation" badge
- Payee-pending: green border-bottom, pulsing green dot, "Confirm received" slab button

### Acceptance criteria
- Full claim → confirm flow settles all splits between two users
- Dispute resets `settled_by_payer`, notifies debtor via toast
- Remind button disabled for 24h after last remind (UI shows "Reminded Xh ago")
- Cancelled claim resets state to fresh on both sides

---

## Task 5: Receipt Scanning

**Goal:** Scan a receipt with Azure Document Intelligence, edit line items, pre-fill ExpenseSheet.

### Deliverables

Rebuild from V1 — same Azure API key (`AZURE_DOCUMENT_INTELLIGENCE_KEY` + `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`):

```
POST /api/expenses/scan   — accepts { imageBase64 }, returns { receipt: ParsedReceipt }
                            Premium + non-child only. Returns 200 with empty items + warning
                            when Azure returns no line items (not a 4xx).
```

**`src/components/money/ReceiptScanner.tsx`**
- Idle state: camera button (mobile, `capture="environment"`) + upload button (desktop)
- Tips overlay: shown once per session (sessionStorage key `roost-receipt-tips-dismissed`)
- Scanning state: animated spinner
- Error state: retry button (only for API/network failures, not empty results)
- Empty state: amber card "No items detected" + "Add items manually" button

**`src/components/money/LineItemEditor.tsx`** — improved from V1:
- Each line item: description (editable), amount (editable), member assignment selector
- Member selector: "Split equally" (default) or pick specific members
- Items assigned to specific members are split only among those members
- "Or enter items manually" skips scanning, opens editor with one empty row
- Confirm → pre-fills ExpenseSheet: title from merchant name, amount from receipt.total ?? subtotal ?? sum of items, customSplits from line item assignments

### Acceptance criteria
- Mobile camera scan returns line items for a clear receipt photo
- Empty scan result shows amber state, not error
- Assigning item to 2 of 4 members creates a split only among those 2
- Manual entry mode works without scanning

---

## Task 6: Recurring Expenses + Bills Tracker

**Goal:** Recurring expense templates create monthly drafts. Bills are flagged recurring expenses with a due-day.

### Deliverables

**API routes (rebuild from V1):**
```
GET/POST         /api/expenses/recurring          — list/create templates
PATCH/DELETE     /api/expenses/recurring/[id]     — edit/soft-delete template
                                                    PATCH now accepts isBill + dueDay
POST             /api/expenses/recurring/[id]/post — confirm draft → creates real expense
POST             /api/expenses/recurring/[id]/skip — skip cycle, advance nextDueDate
```

**New route:**
```
GET /api/money/bills   — recurring expenses where isBill=true, annotated with status:
                          paid   = draft was posted this calendar month
                          due    = dueDay within next 7 days, not yet posted
                          overdue = dueDay passed this month, not yet posted
                          upcoming = dueDay more than 7 days away
                         Returns monthly total, paid total, remaining total.
```

**Schema fields added to RecurringExpenseSheet / EditRecurringSheet:**
- "This is a household bill" toggle (`isBill`)
- When enabled: "Due day of month" number input 1–31 (`dueDay`)

**`src/app/(app)/money/bills/page.tsx`**
- Header: "May — $X total · $Y paid · $Z remaining"
- Bills sorted ascending by `dueDay`
- Each row: name, "due [dueDay][st/nd/rd/th]", amount, split preview, status badge
- Status badge colors: green (paid), amber (due soon), red (overdue), gray (upcoming)
- Amber warning dot on Bills tab label when any bill is overdue

**Cron job** (`/api/cron/recurring-expenses`) — rebuild from V1:
- Runs daily 8am UTC
- Creates `isRecurringDraft=true` expense for any template where `nextDueDate <= today`
- Notifies admin(s) of new drafts
- Sends reminder for drafts unconfirmed for more than 3 days

### Acceptance criteria
- Creating a recurring expense with `isBill=true` and `dueDay=15` appears in bills tab
- Bill status "Overdue" shows when dueDay has passed and no draft is confirmed
- Posting a draft marks the bill as "Paid" in the bills tab for that month
- Monthly totals are accurate

---

## Task 7: Expense Categories

**Goal:** 10 default categories seeded per household. Admins can create custom categories. Members can suggest.

### Deliverables

Rebuild from V1 (logic identical):
```
GET/POST         /api/expenses/categories          — list (auto-seed on first GET) + create
POST             /api/expenses/categories/suggest   — member suggests a new category
PATCH/DELETE     /api/expenses/categories/[id]      — admin: approve/reject/edit/delete
```

**10 default categories** (seeded idempotently on household create + first GET):
Housing, Groceries, Dining, Transport, Utilities, Entertainment, Health, Shopping, Travel, Other

**`src/components/money/CategoryPicker.tsx`**
- 5-column grid of category chips (color-coded)
- Inline "Create category" form for admins (premium)
- Inline "Suggest category" form for members (premium)
- Free users see a lock on the create/suggest form

**Settings page** — add "Expense Categories" section (admin only):
- List custom categories with edit/delete
- List pending suggestions with approve/reject

### Acceptance criteria
- New household has 10 default categories after first GET
- Admin can create a custom category with name, icon, color
- Member suggestion appears in admin settings for approval
- Approved category appears in CategoryPicker

---

## Task 8: Export

**Goal:** Admins and members can export expense history as CSV or PDF.

### Deliverables

Rebuild from V1:
```
GET /api/expenses/export/preview   — ?from=&to= returns { count, total }
GET /api/expenses/export           — ?from=&to=&format=csv|pdf triggers file download
                                     Premium only. PDF via pdfkit (built-in fonts only).
```

**`src/components/money/ExportSheet.tsx`**
- Date range: From + To date inputs
- Quick-range pills: This month / Last 3 months / Last 6 months / This year
- Format toggle: CSV / PDF
- Preview: "X expenses · $Y total"
- Download button triggers GET with Content-Disposition: attachment

### Acceptance criteria
- CSV download contains all expenses in date range with correct columns
- PDF download renders a readable expense report grouped by month
- Preview count matches actual downloaded rows
- Free users see premium gate when tapping Export

---

## Task 9: Budgets

**Goal:** Admins set monthly category caps. All members see budget health. Premium only.

### Deliverables

Rebuild from V1 routes:
```
GET/POST         /api/expenses/budgets       — list/create budget entries
PATCH/DELETE     /api/expenses/budgets/[id]  — edit/delete
```

**`src/app/(app)/money/budget/page.tsx`** (premium gate on the page itself)

Layout:
- **Total monthly bar** — sum of all category caps, current month spend vs total, color shifts green → amber at 70% → red at 100%
- **Per-category rows** — sorted by % used descending (most critical first)
  - Category icon + name
  - Progress bar (section-colored fill)
  - "X spent / Y cap"
  - Status chip: green "On track" / amber "Watch it" / red "Over budget"
  - Tap row → navigates to Expenses tab filtered by that category
- **Add budget** — admin only, icon button in header, opens simple sheet: category picker + monthly cap input

**Budget reset** — 1st of each month. Cron job `/api/cron/budget-reset` sets period_start to new month (rebuild from V1).

### Acceptance criteria
- Setting a $300 dining budget shows "On track" when $150 is spent
- Spending $270 (90%) shows "Watch it" amber chip
- Spending $310 shows "Over budget" red chip
- Total bar reflects sum of all configured caps
- Free users see PremiumGate trigger="page" feature="expenses"

---

## Task 10: Savings Goals

**Goal:** Households set shared savings targets. Members log contributions. Progress tracked.

### Deliverables

```
GET/POST         /api/money/goals                     — list/create goals (admin creates)
PATCH/DELETE     /api/money/goals/[id]                — edit, mark complete, soft delete
POST             /api/money/goals/[id]/contribute      — log contribution (any member)
GET              /api/money/goals/[id]/contributions   — per-member breakdown
```

**`src/components/money/GoalSheet.tsx`** (admin only)
Fields: name, target amount, target date (optional, date picker), description (optional).

**`src/components/money/ContributeSheet.tsx`** (any member)
Fields: goal selector (if multiple active), amount, note (optional).
Validates: amount > 0, goal not completed.

**`src/components/money/GoalDetailSheet.tsx`**
Shows per-member contribution totals as a ranked list with amounts and a small avatar.
Opened by tapping any goal card.

**`src/app/(app)/money/goals/page.tsx`**

Layout:
- Active goals as purple slab cards, sorted by nearest target date first
- Each card: name, progress bar (`#8B5CF6`), "$X saved of $Y · N days left", member avatar row
- "Contribute" button on each card (any member)
- Edit/delete icons on each card (admin only)
- Completed goals collapsed into "Completed" section below, sorted by completedAt desc
- Admin: "Add goal" button in header

**Free tier:** Max 1 active goal. Creating a second shows `MULTIPLE_GOALS_PREMIUM` gate.
Contributions are NOT expenses — they have no effect on balances or debt.

**Activity logging:** `goal_contribution_added` activity type when a member contributes.

### Acceptance criteria
- Admin can create a goal with a target amount and optional date
- Any member can log a contribution; total updates immediately
- Goal shows correct progress bar percentage
- Completing a goal (100% reached or manual complete) moves it to Completed section
- Free user blocked from creating a second active goal

---

## Task 11: Money Dashboard

**Goal:** The `/money` default tab shows a financial overview. All sections visible at a glance.

### Deliverables

```
GET /api/money/dashboard   — single endpoint, one DB fan-out via Promise.all returning:
  balances: { owedToMe: number, iOwe: number, owedToMeFrom: string[], iOweToWhom: string[] }
  bills: BillRow[] (up to 4, current month, sorted by dueDay)
  billsSummary: { total, paid, remaining }
  budgetSummary: { totalBudgeted, totalSpent, categoriesAtRisk: CategoryChip[] }
  activeGoal: GoalSummary | null  (nearest target date)
  goalCount: number
  recentExpenses: ExpenseRow[] (last 5, with userShare)
  isPremium: boolean
```

**`src/app/(app)/money/page.tsx`** — tab shell
- Tab bar: Dashboard · Expenses · Bills · Budget · Goals · Insights
- Tab state via `?tab=` query param, defaults to `dashboard`
- Tab bar scrolls horizontally on mobile

**`src/app/(app)/money/dashboard/page.tsx`**

Card order (stacked, scrollable):
1. **Balance row** — two slab cards side by side (owed to you / you owe). If all settled: single "All settled" card.
2. **Bills this month** — up to 4 bills with status badges. Hidden if no bills exist.
3. **Budget health** — total bar + up to 3 category-at-risk chips. Free users: premium upsell card. Hidden if no budgets configured.
4. **Savings goal** — progress bar for nearest active goal. Free users with no goal: "Start saving together" CTA (PremiumGate inline). Hidden if no goals and premium.
5. **Recent expenses** — last 5 with inline user share (+/- colored). "See all →" link to Expenses tab.
6. **Add expense FAB** — green slab button at bottom.

### Acceptance criteria
- Dashboard loads in a single API call (no waterfall)
- Balance row correctly reflects logged-in user's position
- Bills section hidden when no bills exist
- Budget section shows premium gate for free users
- Tapping "See all →" on any card navigates to the correct tab

---

## Task 12: Insights

**Goal:** Four spending charts for the selected date range. Premium only.

### Deliverables

```
GET /api/money/insights   — ?from=&to= ISO params. Returns:
  spendingOverTime: { month: string, total: number }[]
  byCategory: { categoryId, name, color, total, percentage }[]
  byMember: { userId, name, avatarColor, paid, fairShare }[]
  largestExpenses: ExpenseRow[] (top 10 by amount)
```

**`src/app/(app)/money/insights/page.tsx`** (PremiumGate trigger="page" feature="expenses")

Layout:
- Date range presets at top (This month / Last 3 months / Last 6 months / This year / Custom)
- Four stacked chart sections, each with a label and the chart below

Charts (Recharts, same library as stats page):
1. **Spending over time** — AreaChart, one data point per month, x=month label y=total
2. **By category** — DonutChart with category colors. Legend below.
3. **Who paid vs fair share** — HorizontalBarChart. Two bars per member: paid (solid) vs fair share (dashed line). Fair share = total spend / member count.
4. **Largest expenses** — Plain list (no chart). Title, category badge, who paid, amount. Top 10 descending.

### Acceptance criteria
- Date range change refetches and re-renders all four charts
- DonutChart colors match category colors from CategoryPicker
- "Who paid vs fair share" correctly identifies the member who consistently fronts costs
- Largest expenses list is sorted by amount descending

---

## Task 13: Cron Jobs

**Goal:** Automated recurring expense drafts and settlement reminders run on schedule.

### Deliverables

Rebuild from V1 (vercel.json schedule entries already exist — verify and keep):

**`/api/cron/recurring-expenses`** — daily 8am UTC
- Query all active (non-deleted, non-paused) recurring templates where `nextDueDate <= today`
- For each: create an expense with `isRecurringDraft=true`, using template splits
- Advance template `nextDueDate` using `advanceRecurringDate(from, frequency)`
- Notify admin(s) via activity log entry
- For any existing draft unconfirmed for 3+ days: send reminder activity log entry

**`/api/cron/settlement-reminders`** — daily 10am UTC
- Find all expense splits where `settledByPayer=true`, `settled=false`, `settlementLastRemindedAt < 7 days ago` or null
- Log activity entry reminding payee for each
- Update `settlementLastRemindedAt` on each processed split

Both routes secured with `CRON_SECRET` header check.

### Acceptance criteria
- Cron route returns 401 without correct `CRON_SECRET`
- Recurring expense creates a draft on the correct date and advances nextDueDate
- Settlement reminder does not fire more than once per 7 days per split

---

## Task 14: Premium Gates + Free Tier Limits

**Goal:** All premium gates are wired and enforced server-side and client-side.

### Deliverables

**`src/lib/constants/freeTierLimits.ts`** — add/verify:
```ts
expenses: unlimited (all tiers)
budgets: 0 (premium only)
savingsGoals: 1 (free), unlimited (premium)
insights: 0 (premium only)
receiptScans: 75/month (hidden soft cap, unlimited premium)  // per existing V2 plan
export: 0 (premium only)
recurringExpenses: 0 (premium only)
```

**`src/lib/constants/premiumGateConfig.ts`** — add entries:
```ts
BUDGET_PREMIUM          — Lock icon, "Household Budgets", perks: category caps, monthly overview, budget alerts
MULTIPLE_GOALS_PREMIUM  — Target icon, "More Savings Goals", perks: unlimited active goals
INSIGHTS_PREMIUM        — BarChart2 icon, "Spending Insights", perks: charts, who-paid view, date ranges
```

**Server-side enforcement:**
- Budget POST: `requirePremium()` before insert
- Goals POST (2nd goal): check count of active goals; if ≥ 1 and not premium, return 403 `MULTIPLE_GOALS_PREMIUM`
- Insights GET: `requirePremium()`
- Export GET: `requirePremium()`
- Receipt scan POST: `requirePremium()` (or scan count check if implementing soft cap)
- Recurring expenses POST: `requirePremium()`

**Client-side gates:**
- Budget tab: `<PremiumGate trigger="page" feature="expenses" />` wraps entire page
- Insights tab: `<PremiumGate trigger="page" feature="expenses" />`
- Export button: `onUpgradeRequired("EXPORT_PREMIUM")` pattern
- Receipt scan button: `onUpgradeRequired("RECEIPT_SCANNING_PREMIUM")` pattern
- Recurring expense toggle: `onUpgradeRequired("RECURRING_EXPENSES_PREMIUM")` pattern
- Second goal: `onUpgradeRequired("MULTIPLE_GOALS_PREMIUM")` pattern

### Acceptance criteria
- Free user cannot access Budget or Insights tabs — sees premium gate
- Free user cannot create more than 1 savings goal
- Free user can add expenses, view balances, settle up, view bills
- All 403 responses include `{ error, code, limit?, current? }` shape

---

## File Summary

### New files
```
src/db/schema/savingsGoals.ts
src/app/(app)/money/page.tsx
src/app/(app)/money/dashboard/page.tsx
src/app/(app)/money/expenses/page.tsx
src/app/(app)/money/bills/page.tsx
src/app/(app)/money/budget/page.tsx
src/app/(app)/money/goals/page.tsx
src/app/(app)/money/insights/page.tsx
src/app/api/money/dashboard/route.ts
src/app/api/money/bills/route.ts
src/app/api/money/goals/route.ts
src/app/api/money/goals/[id]/route.ts
src/app/api/money/goals/[id]/contribute/route.ts
src/app/api/money/goals/[id]/contributions/route.ts
src/app/api/money/insights/route.ts
src/components/money/ExpenseSheet.tsx
src/components/money/SettleSheet.tsx
src/components/money/ReceiptScanner.tsx
src/components/money/LineItemEditor.tsx
src/components/money/CategoryPicker.tsx
src/components/money/ExportSheet.tsx
src/components/money/GoalSheet.tsx
src/components/money/GoalDetailSheet.tsx
src/components/money/ContributeSheet.tsx
src/components/money/BillRow.tsx
src/components/money/BudgetCategoryRow.tsx
src/lib/utils/debtSimplification.ts
```

### Rebuilt from V1 (same logic, new location)
```
src/app/api/expenses/route.ts
src/app/api/expenses/[id]/route.ts
src/app/api/expenses/scan/route.ts
src/app/api/expenses/export/route.ts
src/app/api/expenses/export/preview/route.ts
src/app/api/expenses/settle-all/claim/route.ts
src/app/api/expenses/settle-all/confirm/route.ts
src/app/api/expenses/settle-all/dispute/route.ts
src/app/api/expenses/settle-all/cancel/route.ts
src/app/api/expenses/settle-all/remind/route.ts
src/app/api/expenses/recurring/route.ts
src/app/api/expenses/recurring/[id]/route.ts
src/app/api/expenses/recurring/[id]/post/route.ts
src/app/api/expenses/recurring/[id]/skip/route.ts
src/app/api/expenses/categories/route.ts
src/app/api/expenses/categories/[id]/route.ts
src/app/api/expenses/categories/suggest/route.ts
src/app/api/expenses/budgets/route.ts
src/app/api/expenses/budgets/[id]/route.ts
src/app/api/cron/recurring-expenses/route.ts
src/app/api/cron/settlement-reminders/route.ts
src/app/api/cron/budget-reset/route.ts
```

---

## Dependencies

| Task | Depends on |
|---|---|
| 1 Schema | Nothing |
| 2 Core expense API | Task 1 |
| 3 ExpenseSheet + list | Task 2 |
| 4 Settle-up flow | Task 2 |
| 5 Receipt scanning | Task 3 |
| 6 Recurring + bills | Task 2 |
| 7 Categories | Task 2 |
| 8 Export | Task 2 |
| 9 Budgets | Task 7 |
| 10 Savings goals | Task 1 |
| 11 Dashboard | Tasks 2, 6, 9, 10 |
| 12 Insights | Task 2 |
| 13 Cron jobs | Task 6 |
| 14 Premium gates | All tasks |

---

## Navigation Integration

After completing Task 11, add money to the app shell:

- **Sidebar** (`src/components/layout/Sidebar.tsx`): replace "Expenses" nav item with "Money", icon `Wallet`, href `/money`
- **BottomNav** (`src/components/layout/BottomNav.tsx`): the "More" sheet already links to expenses — update href to `/money`
- **Dashboard tiles** (`src/app/(app)/dashboard/page.tsx`): update expenses tile href to `/money`, update statusText logic to use `/api/money/dashboard` balance data
- **CLAUDE.md**: update section color entry and file registry after implementation
