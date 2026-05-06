# Stats Page Design

**Date:** 2026-05-06
**Feature:** Household Stats (`/stats`)
**Status:** Approved, ready for implementation

---

## Overview

A premium-only household stats page that combines gamification (leaderboard, points) with serious household health data (spending, chores, tasks). Visible to all household members; admins can toggle which sections are visible.

---

## Layout

Single scrolling page, top to bottom:

1. Page header ("Stats" + subtitle)
2. Date range pills (sticky near top)
3. 2×2 summary stat chips
4. Leaderboard section
5. Chart cards (one per domain)

No tabs, no nested navigation. Works on mobile and desktop.

---

## Date Range Controls

Pills: **7 days** | **30 days** (default) | **90 days** | **This year** | **Custom**

Custom opens a date range picker (start + end date inputs). Selecting any pill or custom range triggers a refetch of `/api/stats`.

---

## Summary Chips (2×2 grid)

| Position | Label | Data |
|---|---|---|
| Top left | Chores done | Count of completions in period |
| Top right | Total spent | Sum of all expenses ($) in period |
| Bottom left | Tasks done | Count of completed tasks in period |
| Bottom right | Meals planned | Count of planner slots filled in period |

Each chip: large number (font-weight 900), small muted label below, slab card style with neutral bottom border.

---

## Leaderboard Section

Section label: "Leaderboard" in indigo (`#6366F1`), uppercase, small.

All household members ranked by **points earned in the selected period** (from chore_completions). Each member card shows:
- Rank badge: 1st/2nd/3rd with medal icon from Lucide (Trophy for 1st, Award for 2nd, Star for 3rd). 4th+ shows rank number only.
- MemberAvatar (initials, avatar_color)
- Name
- Chores completed in period
- Points earned in period

Top-ranked card has indigo slab bottom border (`#A5B4FC`). Others use neutral border.

---

## Chart Cards

Each card uses `ChartCard` wrapper: slab card, section-colored bottom border, card title. Charts rendered with Recharts.

### 1. Chores over time
- Section color: `#EF4444` (chores red)
- Chart: AreaChart — completions per day over selected period
- Stat shown: "Most completed: [chore name]"

### 2. Spending by category
- Section color: `#22C55E` (expenses green)
- Chart: Recharts PieChart (donut) — expense total per category
- Stat shown: Total spent in period

### 3. Spending over time
- Section color: `#22C55E` (expenses green)
- Chart: AreaChart — daily spend over selected period
- Shown only if expenses exist in the period

### 4. Tasks by priority
- Section color: `#EC4899` (tasks pink)
- Chart: PieChart (donut) — High / Medium / Low / None breakdown
- Stat shown: Completion rate (completed / total × 100)

### 5. Top meals
- Section color: `#F97316` (meals orange)
- Chart: Horizontal BarChart — top 5 most-planned meal names by slot count
- Stat shown: Total meals planned in period

### 6. Grocery activity
- Section color: `#F59E0B` (grocery amber)
- Chart: BarChart — items added vs items checked per week
- Stat shown: Check rate % (checked / added × 100)

---

## Admin Visibility Toggle

Admins can show/hide each section of the stats page for the whole household. Lives in **Settings → Stats** section (admin only).

Toggles:
- Leaderboard
- Chores
- Expenses
- Tasks
- Meals
- Grocery

**Storage:** New nullable JSON column `stats_visibility` on the `households` table. Default (null) = all sections visible.

Shape:
```json
{ "leaderboard": true, "chores": true, "expenses": true, "tasks": true, "meals": true, "grocery": true }
```

**API:** Admin updates via `PATCH /api/household/[id]` (extends existing route with `statsVisibility` field). Visibility settings returned in `GET /api/household/me` response so the stats page has them without an extra fetch.

---

## API

### `GET /api/stats?start=ISO&end=ISO`

Premium-gated. Blocks child accounts. Runs all queries in parallel (`Promise.all`).

Returns:
```ts
{
  chores: {
    totalCompletions: number
    completionsOverTime: { date: string; count: number }[]
    completionsPerMember: { userId: string; name: string; count: number; points: number }[]
    mostCompletedChore: string | null
    pointsPerMember: { userId: string; points: number }[]
  }
  expenses: {
    totalSpent: number
    byCategory: { category: string; total: number }[]
    overTime: { date: string; total: number }[]
  }
  tasks: {
    totalCompleted: number
    completionRate: number
    byPriority: { priority: string; count: number }[]
  }
  meals: {
    totalPlanned: number
    topMeals: { name: string; count: number }[]
  }
  grocery: {
    itemsAdded: number
    itemsChecked: number
    checkRate: number
  }
}
```

---

## Schema Changes

```sql
ALTER TABLE households ADD COLUMN stats_visibility jsonb;
```

Run `npm run db:push` after schema update.

---

## Components

| File | Purpose |
|---|---|
| `src/app/(app)/stats/page.tsx` | Page: date state, single useQuery, section visibility, renders all sections |
| `src/components/stats/StatsSummaryRow.tsx` | 2×2 stat chip grid |
| `src/components/stats/StatsLeaderboard.tsx` | Ranked member cards, medal icons |
| `src/components/stats/ChartCard.tsx` | Reusable slab card wrapper with section-colored border and title |
| `src/components/stats/ChoreChart.tsx` | Area chart for chore completions |
| `src/components/stats/ExpenseCharts.tsx` | Donut + area charts for expenses |
| `src/components/stats/TaskChart.tsx` | Donut chart for tasks by priority |
| `src/components/stats/MealChart.tsx` | Horizontal bar for top meals |
| `src/components/stats/GroceryChart.tsx` | Bar chart for grocery add vs check |

---

## State

```ts
type Range = '7d' | '30d' | '90d' | 'year' | 'custom'
const [range, setRange] = useState<Range>('30d')
const [customStart, setCustomStart] = useState<string>('')
const [customEnd, setCustomEnd] = useState<string>('')
```

Query key: `['stats', range, customStart, customEnd]` — auto-refetches on range change.

---

## Premium Gate

Full-page gate rendered when `!isPremium`. Uses `PremiumGate` component with `trigger="page"` and `feature="stats"`.

---

## Error States

- Stats API fails: `ErrorState` component with "Try again" button
- No data in range: Each chart card shows its own empty state (dashed border, muted label)
- Loading: skeleton loaders (gray rounded rectangles) in place of chips and chart cards

---

## Out of Scope

- Per-member stats breakdown page (drill-down)
- Exporting stats as CSV/PDF
- Push notification for weekly stats summary
- Budget vs actual comparison charts
