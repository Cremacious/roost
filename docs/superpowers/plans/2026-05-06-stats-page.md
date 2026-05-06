# Stats Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the household stats page at `/stats` — a premium-only scrolling page with date range controls, 2×2 summary chips, a points-based leaderboard, and 6 Recharts chart cards covering chores, expenses, tasks, meals, and grocery data. Admins can toggle section visibility in Settings.

**Architecture:** Single `GET /api/stats?start=ISO&end=ISO` endpoint runs all queries in parallel via `Promise.all`. The page holds date range state and fires a TanStack Query that refetches on every range change. Each visual section is its own component in `src/components/stats/`. A `stats_visibility` JSON column on `households` controls which sections render; it is returned by `GET /api/household/me` and written by the existing `PATCH /api/household/[id]` route. Premium gate is an inline full-page block in `stats/page.tsx` — no shared component needed.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM + Neon, TanStack Query 5, Recharts 3, Lucide React, Framer Motion 12, Sonner toasts

---

## File Map

Files created or modified by this plan:

```
apps/web/src/
  lib/constants/colors.ts                     MODIFY — add stats: #6366F1 / #4F46E5
  db/schema/households.ts                     MODIFY — add stats_visibility text column
  app/api/
    stats/route.ts                            CREATE — GET: premium-gated parallel SQL queries
    household/me/route.ts                     MODIFY — return statsVisibility in response
    household/[id]/route.ts                   MODIFY — accept statsVisibility in PATCH body
  components/stats/
    ChartCard.tsx                             CREATE — SlabCard wrapper with title/stat/color
    StatsSummaryRow.tsx                       CREATE — 2×2 chip grid
    StatsLeaderboard.tsx                      CREATE — ranked member cards with medal icons
    ChoreChart.tsx                            CREATE — AreaChart for completions over time
    ExpenseCharts.tsx                         CREATE — Donut + AreaChart for expenses
    TaskChart.tsx                             CREATE — Donut for tasks by priority
    MealChart.tsx                             CREATE — Horizontal BarChart for top meals
    GroceryChart.tsx                          CREATE — BarChart for grocery add vs check
  app/(app)/stats/page.tsx                    MODIFY — full implementation (replaces placeholder)
  app/(app)/settings/page.tsx                 MODIFY — add Stats section with visibility toggles (admin)
e2e/phase1.spec.ts                            MODIFY — add stats premium gate test
```

---

## Task 1: Schema + Colors

**Files:**
- Modify: `apps/web/src/lib/constants/colors.ts`
- Modify: `apps/web/src/db/schema/households.ts`

Adds the `stats` indigo section color and the `stats_visibility` nullable JSON text column. After the schema change, run `npm run db:push` to sync with Neon.

- [ ] **Step 1: Add stats to SECTION_COLORS**

Open `apps/web/src/lib/constants/colors.ts` and add the stats entry:

```typescript
export const SECTION_COLORS = {
  chores:    { base: '#EF4444', dark: '#C93B3B' },
  grocery:   { base: '#F59E0B', dark: '#C87D00' },
  calendar:  { base: '#3B82F6', dark: '#1A5CB5' },
  expenses:  { base: '#22C55E', dark: '#159040' },
  meals:     { base: '#F97316', dark: '#C4581A' },
  notes:     { base: '#A855F7', dark: '#7C28C8' },
  reminders: { base: '#06B6D4', dark: '#0891B2' },
  tasks:     { base: '#EC4899', dark: '#B02878' },
  stats:     { base: '#6366F1', dark: '#4F46E5' },
} as const

export type SectionKey = keyof typeof SECTION_COLORS
```

- [ ] **Step 2: Add stats_visibility column to households schema**

Open `apps/web/src/db/schema/households.ts` and add `statsVisibility`:

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const households = pgTable('households', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  adminId: text('admin_id').notNull(),
  subscriptionStatus: text('subscription_status')
    .notNull()
    .default('free')
    .$type<'free' | 'premium'>(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  premiumExpiresAt: timestamp('premium_expires_at'),
  revenuecatAppUserId: text('revenuecat_app_user_id'),
  statsVisibility: text('stats_visibility'),  // JSON: { leaderboard, chores, expenses, tasks, meals, grocery }
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
```

- [ ] **Step 3: Push schema to Neon**

```bash
cd apps/web && npm run db:push
```

Confirm the output shows `stats_visibility` column added with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/constants/colors.ts apps/web/src/db/schema/households.ts
git commit -m "feat(stats): add stats section color and stats_visibility schema column"
```

---

## Task 2: Stats API Route

**Files:**
- Create: `apps/web/src/app/api/stats/route.ts`

Premium-gated GET endpoint. Reads `?start=ISO&end=ISO` params (defaults to last 30 days when absent). Runs all queries in parallel via `Promise.all`. Child accounts blocked. Returns data for all 6 sections.

- [ ] **Step 1: Create `src/app/api/stats/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import {
  chores, choreCompletions, choreStreaks,
  expenses, expenseSplits,
  tasks,
  mealPlanSlots, meals,
  groceryItems,
  users, householdMembers,
} from '@/db/schema'
import { eq, and, isNull, gte, lte, desc } from 'drizzle-orm'

function parseRange(searchParams: URLSearchParams): { start: Date; end: Date } {
  const startStr = searchParams.get('start')
  const endStr = searchParams.get('end')
  const end = endStr ? new Date(endStr) : new Date()
  const start = startStr ? new Date(startStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return { start, end }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'STATS_PREMIUM' }, { status: 403 })
  }

  // Child accounts blocked from stats
  const userRow = await db.select({ isChild: users.isChildAccount })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then(r => r[0] ?? null)
  if (userRow?.isChild) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { householdId } = membership
  const { start, end } = parseRange(req.nextUrl.searchParams)

  const [
    choreCompletionsRows,
    completionsOverTime,
    completionsPerMember,
    expensesRows,
    expensesByCategory,
    expensesOverTime,
    tasksRows,
    tasksByPriority,
    mealSlots,
    topMeals,
    groceryItemsAdded,
    groceryItemsChecked,
    membersRows,
  ] = await Promise.all([
    // Total chore completions
    db.select({ count: sql<number>`count(*)::int` })
      .from(choreCompletions)
      .where(and(
        eq(choreCompletions.householdId, householdId),
        gte(choreCompletions.completedAt, start),
        lte(choreCompletions.completedAt, end),
      ))
      .then(r => r[0]?.count ?? 0),

    // Completions per day for area chart
    db.execute(sql`
      SELECT date_trunc('day', completed_at)::date::text AS date, count(*)::int AS count
      FROM chore_completions
      WHERE household_id = ${householdId}
        AND completed_at >= ${start} AND completed_at <= ${end}
      GROUP BY 1 ORDER BY 1
    `).then(r => r.rows as { date: string; count: number }[]),

    // Completions + points per member
    db.execute(sql`
      SELECT cc.user_id AS "userId", u.name, count(*)::int AS count,
             coalesce(sum(cs.points), 0)::int AS points
      FROM chore_completions cc
      JOIN users u ON u.id = cc.user_id
      LEFT JOIN chore_streaks cs ON cs.user_id = cc.user_id AND cs.household_id = cc.household_id
      WHERE cc.household_id = ${householdId}
        AND cc.completed_at >= ${start} AND cc.completed_at <= ${end}
      GROUP BY cc.user_id, u.name
      ORDER BY points DESC
    `).then(r => r.rows as { userId: string; name: string; count: number; points: number }[]),

    // Total expenses
    db.execute(sql`
      SELECT coalesce(sum(amount), 0)::float AS total
      FROM expenses
      WHERE household_id = ${householdId}
        AND created_at >= ${start} AND created_at <= ${end}
        AND deleted_at IS NULL
    `).then(r => parseFloat(String(r.rows[0]?.total ?? '0'))),

    // Expenses by category
    db.execute(sql`
      SELECT coalesce(category, 'Other') AS category, sum(amount)::float AS total
      FROM expenses
      WHERE household_id = ${householdId}
        AND created_at >= ${start} AND created_at <= ${end}
        AND deleted_at IS NULL
      GROUP BY 1 ORDER BY total DESC
    `).then(r => r.rows as { category: string; total: number }[]),

    // Expenses over time
    db.execute(sql`
      SELECT date_trunc('day', created_at)::date::text AS date, sum(amount)::float AS total
      FROM expenses
      WHERE household_id = ${householdId}
        AND created_at >= ${start} AND created_at <= ${end}
        AND deleted_at IS NULL
      GROUP BY 1 ORDER BY 1
    `).then(r => r.rows as { date: string; total: number }[]),

    // Tasks completed
    db.execute(sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE completed = true)::int AS completed
      FROM tasks
      WHERE household_id = ${householdId}
        AND created_at >= ${start} AND created_at <= ${end}
        AND deleted_at IS NULL
    `).then(r => r.rows[0] as { total: number; completed: number }),

    // Tasks by priority
    db.execute(sql`
      SELECT coalesce(priority, 'none') AS priority, count(*)::int AS count
      FROM tasks
      WHERE household_id = ${householdId}
        AND created_at >= ${start} AND created_at <= ${end}
        AND deleted_at IS NULL
      GROUP BY 1
    `).then(r => r.rows as { priority: string; count: number }[]),

    // Meal plan slots total
    db.execute(sql`
      SELECT count(*)::int AS total
      FROM meal_plan_slots
      WHERE household_id = ${householdId}
        AND slot_date >= ${start}::date AND slot_date <= ${end}::date
        AND deleted_at IS NULL
    `).then(r => (r.rows[0] as { total: number })?.total ?? 0),

    // Top 5 meals by slot count
    db.execute(sql`
      SELECT m.name, count(*)::int AS count
      FROM meal_plan_slots mps
      JOIN meals m ON m.id = mps.meal_id
      WHERE mps.household_id = ${householdId}
        AND mps.slot_date >= ${start}::date AND mps.slot_date <= ${end}::date
        AND mps.deleted_at IS NULL AND m.deleted_at IS NULL
      GROUP BY m.name ORDER BY count DESC LIMIT 5
    `).then(r => r.rows as { name: string; count: number }[]),

    // Grocery items added
    db.execute(sql`
      SELECT count(*)::int AS count
      FROM grocery_items gi
      JOIN grocery_lists gl ON gl.id = gi.list_id
      WHERE gl.household_id = ${householdId}
        AND gi.created_at >= ${start} AND gi.created_at <= ${end}
        AND gi.deleted_at IS NULL
    `).then(r => (r.rows[0] as { count: number })?.count ?? 0),

    // Grocery items checked
    db.execute(sql`
      SELECT count(*)::int AS count
      FROM grocery_items gi
      JOIN grocery_lists gl ON gl.id = gi.list_id
      WHERE gl.household_id = ${householdId}
        AND gi.checked = true
        AND gi.created_at >= ${start} AND gi.created_at <= ${end}
        AND gi.deleted_at IS NULL
    `).then(r => (r.rows[0] as { count: number })?.count ?? 0),

    // Members for leaderboard (to get avatarColor)
    db.select({
      userId: householdMembers.userId,
      name: users.name,
      avatarColor: users.avatarColor,
    })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(and(eq(householdMembers.householdId, householdId), isNull(householdMembers.deletedAt))),
  ])

  const memberMap = Object.fromEntries(membersRows.map(m => [m.userId, m]))

  const leaderboard = completionsPerMember.map(m => ({
    ...m,
    avatarColor: memberMap[m.userId]?.avatarColor ?? null,
  }))

  const totalTasks = (tasksRows as { total: number; completed: number })?.total ?? 0
  const completedTasks = (tasksRows as { total: number; completed: number })?.completed ?? 0
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

  const groceryCheckRate = groceryItemsAdded === 0
    ? 0
    : Math.round((groceryItemsChecked / groceryItemsAdded) * 100)

  // Most completed chore name
  const mostCompletedRow = await db.execute(sql`
    SELECT c.title, count(*)::int AS count
    FROM chore_completions cc
    JOIN chores c ON c.id = cc.chore_id
    WHERE cc.household_id = ${householdId}
      AND cc.completed_at >= ${start} AND cc.completed_at <= ${end}
    GROUP BY c.title ORDER BY count DESC LIMIT 1
  `).then(r => r.rows[0] as { title: string; count: number } | undefined)

  return NextResponse.json({
    chores: {
      totalCompletions: choreCompletionsRows as number,
      completionsOverTime,
      mostCompletedChore: mostCompletedRow?.title ?? null,
      leaderboard,
    },
    expenses: {
      totalSpent: expensesRows,
      byCategory: expensesByCategory,
      overTime: expensesOverTime,
    },
    tasks: {
      totalCompleted: completedTasks,
      completionRate,
      byPriority: tasksByPriority,
    },
    meals: {
      totalPlanned: mealSlots as number,
      topMeals,
    },
    grocery: {
      itemsAdded: groceryItemsAdded as number,
      itemsChecked: groceryItemsChecked as number,
      checkRate: groceryCheckRate,
    },
  })
}
```

- [ ] **Step 2: Smoke-test the route**

```bash
# Start dev server in one terminal, then in another:
curl "http://localhost:3001/api/stats?start=2026-01-01&end=2026-12-31" \
  -H "Cookie: <your-session-cookie>"
# Free account: expect {"error":"Premium required","code":"STATS_PREMIUM"} with 403
# Premium account: expect JSON with chores/expenses/tasks/meals/grocery keys
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/stats/
git commit -m "feat(stats): add GET /api/stats premium-gated parallel aggregation route"
```

---

## Task 3: Update /api/household/me to Return statsVisibility

**Files:**
- Modify: `apps/web/src/app/api/household/me/route.ts`

The stats page and settings page both need the visibility config without an extra fetch.

- [ ] **Step 1: Update the household select to include statsVisibility**

In `src/app/api/household/me/route.ts`, update the `householdRow` select to include `statsVisibility`:

```typescript
const [householdRow, members] = await Promise.all([
  db
    .select({
      id: households.id,
      name: households.name,
      inviteCode: households.inviteCode,
      adminId: households.adminId,
      subscriptionStatus: households.subscriptionStatus,
      statsVisibility: households.statsVisibility,
    })
    .from(households)
    .where(and(eq(households.id, householdId), isNull(households.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null),
  // ... members query unchanged
])
```

Also update the response to parse the JSON:

```typescript
return NextResponse.json({
  household: {
    ...householdRow,
    statsVisibility: householdRow.statsVisibility
      ? JSON.parse(householdRow.statsVisibility)
      : { leaderboard: true, chores: true, expenses: true, tasks: true, meals: true, grocery: true },
  },
  role: membership.role,
  members: members.map(m => ({
    userId: m.userId,
    name: m.name,
    avatarColor: m.avatarColor,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
  })),
})
```

- [ ] **Step 2: Verify**

```bash
curl "http://localhost:3001/api/household/me" -H "Cookie: <session>"
# Expect: { household: { ..., statsVisibility: { leaderboard: true, ... } }, role, members }
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/household/me/route.ts
git commit -m "feat(stats): return statsVisibility in GET /api/household/me"
```

---

## Task 4: Update PATCH /api/household/[id] to Accept statsVisibility

**Files:**
- Create: `apps/web/src/app/api/household/[id]/route.ts`

This route may not exist yet in the worktree. Create it (or add to it) so admins can update `stats_visibility`.

- [ ] **Step 1: Check if file exists**

```bash
ls apps/web/src/app/api/household/
# If [id] directory is missing, create it
```

- [ ] **Step 2: Create or update the PATCH route**

Create `apps/web/src/app/api/household/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership || membership.householdId !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim()
  }
  if (body.statsVisibility && typeof body.statsVisibility === 'object') {
    updates.statsVisibility = JSON.stringify(body.statsVisibility)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.update(households)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(households.id, params.id))

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Test the PATCH**

```bash
curl -X PATCH "http://localhost:3001/api/household/<household-id>" \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session>" \
  -d '{"statsVisibility":{"leaderboard":false,"chores":true,"expenses":true,"tasks":true,"meals":true,"grocery":true}}'
# Expect: {"ok":true}
# Then: GET /api/household/me should return the updated statsVisibility
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/household/
git commit -m "feat(stats): add PATCH /api/household/[id] for name + statsVisibility updates"
```

---

## Task 5: ChartCard Component

**Files:**
- Create: `apps/web/src/components/stats/ChartCard.tsx`

A slab card wrapper that all chart cards share. Has a title, an optional stat line below the title, a section-colored bottom border, and a children slot for the actual chart.

- [ ] **Step 1: Create `src/components/stats/ChartCard.tsx`**

```typescript
import { SlabCard } from '@/components/ui/SlabCard'

interface ChartCardProps {
  title: string
  stat?: string
  color: string
  children: React.ReactNode
  empty?: boolean
}

export function ChartCard({ title, stat, color, children, empty }: ChartCardProps) {
  return (
    <SlabCard color={color} style={{ marginBottom: 10 }}>
      <div style={{ padding: '14px 14px 10px' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>
          {title}
        </p>
        {stat && (
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
            {stat}
          </p>
        )}
      </div>
      {empty ? (
        <div style={{
          margin: '0 14px 14px',
          height: 80,
          borderRadius: 10,
          border: '2px dashed var(--roost-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)', margin: 0 }}>
            No data in this period
          </p>
        </div>
      ) : (
        <div style={{ paddingBottom: 10 }}>
          {children}
        </div>
      )}
    </SlabCard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/stats/ChartCard.tsx
git commit -m "feat(stats): add ChartCard slab wrapper component"
```

---

## Task 6: StatsSummaryRow Component

**Files:**
- Create: `apps/web/src/components/stats/StatsSummaryRow.tsx`

2×2 grid of stat chips. Each chip shows a large number (font-weight 900) and a muted label. All use neutral bottom border per the design (these are not feature-specific cards).

- [ ] **Step 1: Create `src/components/stats/StatsSummaryRow.tsx`**

```typescript
interface SummaryChipProps {
  value: string
  label: string
}

function SummaryChip({ value, label }: SummaryChipProps) {
  return (
    <div style={{
      backgroundColor: 'var(--roost-surface)',
      border: '1.5px solid var(--roost-border)',
      borderBottom: '4px solid var(--roost-border-bottom)',
      borderRadius: 14,
      padding: 12,
    }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--roost-text-primary)' }}>
        {value}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
        {label}
      </p>
    </div>
  )
}

interface StatsSummaryRowProps {
  choresDone: number
  totalSpent: number
  tasksDone: number
  mealsPlanned: number
}

export function StatsSummaryRow({ choresDone, totalSpent, tasksDone, mealsPlanned }: StatsSummaryRowProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 12px' }}>
      <SummaryChip value={String(choresDone)} label="Chores done" />
      <SummaryChip value={`$${totalSpent.toFixed(0)}`} label="Total spent" />
      <SummaryChip value={String(tasksDone)} label="Tasks done" />
      <SummaryChip value={String(mealsPlanned)} label="Meals planned" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/stats/StatsSummaryRow.tsx
git commit -m "feat(stats): add StatsSummaryRow 2x2 chip grid component"
```

---

## Task 7: StatsLeaderboard Component

**Files:**
- Create: `apps/web/src/components/stats/StatsLeaderboard.tsx`

Ranked member cards. Uses Trophy (1st), Award (2nd), Star (3rd) from Lucide for top 3. 4th+ shows rank number. Top card gets indigo slab border, others neutral.

- [ ] **Step 1: Create `src/components/stats/StatsLeaderboard.tsx`**

```typescript
import { Trophy, Award, Star } from 'lucide-react'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.stats.base    // #6366F1
const COLOR_DARK = SECTION_COLORS.stats.dark  // #4F46E5

interface LeaderboardMember {
  userId: string
  name: string
  avatarColor: string | null
  count: number
  points: number
}

function RankBadge({ rank }: { rank: number }) {
  const style: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  if (rank === 1) return (
    <div style={{ ...style, backgroundColor: `${COLOR}18` }}>
      <Trophy size={16} color={COLOR} />
    </div>
  )
  if (rank === 2) return (
    <div style={{ ...style, backgroundColor: '#F3F4F6' }}>
      <Award size={16} color="#6B7280" />
    </div>
  )
  if (rank === 3) return (
    <div style={{ ...style, backgroundColor: '#F3F4F6' }}>
      <Star size={16} color="#6B7280" />
    </div>
  )
  return (
    <div style={{ ...style, backgroundColor: '#F3F4F6' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#6B7280' }}>{rank}</span>
    </div>
  )
}

function MemberCard({ member, rank }: { member: LeaderboardMember; rank: number }) {
  const isFirst = rank === 1
  const initials = member.name.split(' ').map(p => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
  const avatarBg = member.avatarColor ?? '#E5E7EB'

  return (
    <div style={{
      backgroundColor: 'var(--roost-surface)',
      border: '1.5px solid var(--roost-border)',
      borderBottom: `4px solid ${isFirst ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <RankBadge rank={rank} />
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: avatarBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{initials}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.name}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
          {member.count} {member.count === 1 ? 'chore' : 'chores'} · {member.points} pts
        </p>
      </div>
      <div style={{
        backgroundColor: isFirst ? `${COLOR}18` : '#F3F4F6',
        borderRadius: 8,
        padding: '4px 8px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: isFirst ? COLOR : '#6B7280' }}>
          {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
        </span>
      </div>
    </div>
  )
}

interface StatsLeaderboardProps {
  members: LeaderboardMember[]
}

export function StatsLeaderboard({ members }: StatsLeaderboardProps) {
  const COLOR_LABEL = SECTION_COLORS.stats.base

  if (members.length === 0) {
    return (
      <div style={{
        padding: '0 16px 12px',
      }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: COLOR_LABEL, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
          Leaderboard
        </p>
        <div style={{
          backgroundColor: 'var(--roost-surface)',
          border: '2px dashed var(--roost-border)',
          borderRadius: 14,
          padding: '20px 16px',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
            No chore completions in this period
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 12px' }}>
      <p style={{ fontSize: 13, fontWeight: 900, color: COLOR_LABEL, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
        Leaderboard
      </p>
      {members.map((m, i) => (
        <MemberCard key={m.userId} member={m} rank={i + 1} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/stats/StatsLeaderboard.tsx
git commit -m "feat(stats): add StatsLeaderboard component with medal icons"
```

---

## Task 8: Chore and Expense Charts

**Files:**
- Create: `apps/web/src/components/stats/ChoreChart.tsx`
- Create: `apps/web/src/components/stats/ExpenseCharts.tsx`

Both use Recharts. ChoreChart is an AreaChart (completions per day). ExpenseCharts renders a PieChart (donut) for spending by category and an AreaChart for spending over time.

- [ ] **Step 1: Create `src/components/stats/ChoreChart.tsx`**

```typescript
'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartCard } from './ChartCard'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.chores.base  // #EF4444

interface ChoreChartProps {
  data: { date: string; count: number }[]
  mostCompletedChore: string | null
}

export function ChoreChart({ data, mostCompletedChore }: ChoreChartProps) {
  const stat = mostCompletedChore ? `Most completed: ${mostCompletedChore}` : undefined
  return (
    <ChartCard title="Chores over time" stat={stat} color={COLOR} empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 14, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="choreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR} stopOpacity={0.25} />
              <stop offset="95%" stopColor={COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--roost-border)' }} />
          <Area type="monotone" dataKey="count" stroke={COLOR} strokeWidth={2} fill="url(#choreGrad)" name="Completions" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
```

- [ ] **Step 2: Create `src/components/stats/ExpenseCharts.tsx`**

```typescript
'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartCard } from './ChartCard'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.expenses.base  // #22C55E

const DONUT_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#A855F7', '#F97316', '#06B6D4', '#EF4444']

interface ExpenseChartsProps {
  byCategory: { category: string; total: number }[]
  overTime: { date: string; total: number }[]
  totalSpent: number
}

export function ExpenseCharts({ byCategory, overTime, totalSpent }: ExpenseChartsProps) {
  return (
    <>
      <ChartCard
        title="Spending by category"
        stat={`Total: $${totalSpent.toFixed(2)}`}
        color={COLOR}
        empty={byCategory.length === 0}
      >
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={byCategory}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={58}
              paddingAngle={2}
              dataKey="total"
              nameKey="category"
            >
              {byCategory.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--roost-border)' }}
              formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {overTime.length > 0 && (
        <ChartCard title="Spending over time" color={COLOR}>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={overTime} margin={{ top: 4, right: 14, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--roost-border)' }} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']} />
              <Area type="monotone" dataKey="total" stroke={COLOR} strokeWidth={2} fill="url(#expenseGrad)" name="Spent" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/stats/ChoreChart.tsx apps/web/src/components/stats/ExpenseCharts.tsx
git commit -m "feat(stats): add ChoreChart and ExpenseCharts Recharts components"
```

---

## Task 9: Task, Meal, and Grocery Charts

**Files:**
- Create: `apps/web/src/components/stats/TaskChart.tsx`
- Create: `apps/web/src/components/stats/MealChart.tsx`
- Create: `apps/web/src/components/stats/GroceryChart.tsx`

- [ ] **Step 1: Create `src/components/stats/TaskChart.tsx`**

```typescript
'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartCard } from './ChartCard'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.tasks.base  // #EC4899
const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#94A3B8',
  none: '#D1D5DB',
}

interface TaskChartProps {
  byPriority: { priority: string; count: number }[]
  completionRate: number
}

export function TaskChart({ byPriority, completionRate }: TaskChartProps) {
  const data = byPriority.map(p => ({ ...p, fill: PRIORITY_COLORS[p.priority] ?? '#D1D5DB' }))
  return (
    <ChartCard
      title="Tasks by priority"
      stat={`Completion rate: ${completionRate}%`}
      color={COLOR}
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={58}
            paddingAngle={2}
            dataKey="count"
            nameKey="priority"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--roost-border)' }}
            formatter={(v: number, _name: string, props: { payload: { priority: string } }) => [v, props.payload.priority]}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
```

- [ ] **Step 2: Create `src/components/stats/MealChart.tsx`**

```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartCard } from './ChartCard'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.meals.base  // #F97316

interface MealChartProps {
  topMeals: { name: string; count: number }[]
  totalPlanned: number
}

export function MealChart({ topMeals, totalPlanned }: MealChartProps) {
  return (
    <ChartCard
      title="Top meals"
      stat={`${totalPlanned} meals planned`}
      color={COLOR}
      empty={topMeals.length === 0}
    >
      <ResponsiveContainer width="100%" height={Math.max(topMeals.length * 30 + 20, 100)}>
        <BarChart
          data={topMeals}
          layout="vertical"
          margin={{ top: 4, right: 14, left: 8, bottom: 0 }}
        >
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={n => n.length > 14 ? n.slice(0, 13) + '…' : n}
          />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--roost-border)' }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Times planned">
            {topMeals.map((_, i) => (
              <Cell key={i} fill={COLOR} opacity={1 - i * 0.12} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
```

- [ ] **Step 3: Create `src/components/stats/GroceryChart.tsx`**

```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.grocery.base  // #F59E0B

interface GroceryChartProps {
  itemsAdded: number
  itemsChecked: number
  checkRate: number
}

export function GroceryChart({ itemsAdded, itemsChecked, checkRate }: GroceryChartProps) {
  const data = [
    { label: 'This period', added: itemsAdded, checked: itemsChecked },
  ]
  return (
    <ChartCard
      title="Grocery activity"
      stat={`Check rate: ${checkRate}%`}
      color={COLOR}
      empty={itemsAdded === 0}
    >
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 4, right: 14, left: -24, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--roost-border)' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="added" name="Added" fill={COLOR} radius={[4, 4, 0, 0]} />
          <Bar dataKey="checked" name="Checked" fill={SECTION_COLORS.expenses.base} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/stats/TaskChart.tsx apps/web/src/components/stats/MealChart.tsx apps/web/src/components/stats/GroceryChart.tsx
git commit -m "feat(stats): add TaskChart, MealChart, GroceryChart Recharts components"
```

---

## Task 10: Stats Page

**Files:**
- Modify: `apps/web/src/app/(app)/stats/page.tsx`

Full page implementation. Holds date state, fires the stats query, shows premium gate for non-premium users, renders all sections conditioned on `statsVisibility`.

- [ ] **Step 1: Replace the placeholder with the full stats page**

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart2 } from 'lucide-react'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { StatsSummaryRow } from '@/components/stats/StatsSummaryRow'
import { StatsLeaderboard } from '@/components/stats/StatsLeaderboard'
import { ChoreChart } from '@/components/stats/ChoreChart'
import { ExpenseCharts } from '@/components/stats/ExpenseCharts'
import { TaskChart } from '@/components/stats/TaskChart'
import { MealChart } from '@/components/stats/MealChart'
import { GroceryChart } from '@/components/stats/GroceryChart'

const COLOR = SECTION_COLORS.stats.base   // #6366F1
const COLOR_DARK = SECTION_COLORS.stats.dark  // #4F46E5

type Range = '7d' | '30d' | '90d' | 'year' | 'custom'

const RANGE_LABELS: Record<Range, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  year: 'This year',
  custom: 'Custom',
}

function getDateRange(range: Range, customStart: string, customEnd: string): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString()
  if (range === 'custom' && customStart && customEnd) {
    return { start: new Date(customStart).toISOString(), end: new Date(customEnd).toISOString() }
  }
  if (range === '7d') return { start: new Date(Date.now() - 7 * 86400_000).toISOString(), end }
  if (range === '90d') return { start: new Date(Date.now() - 90 * 86400_000).toISOString(), end }
  if (range === 'year') return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end }
  // default 30d
  return { start: new Date(Date.now() - 30 * 86400_000).toISOString(), end }
}

function PremiumGate() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 16,
      padding: 32,
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: `${COLOR}18`,
        border: `1.5px solid var(--roost-border)`,
        borderBottom: `4px solid ${COLOR_DARK}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <BarChart2 size={28} color={COLOR} />
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: 'var(--roost-text-primary)' }}>
          Stats is a Premium feature
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)', maxWidth: 280 }}>
          See chores, spending, tasks, meals, and grocery trends all in one place.
        </p>
      </div>
      <a
        href="/settings/billing"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          borderRadius: 14,
          backgroundColor: COLOR,
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          textDecoration: 'none',
          borderBottom: `3px solid ${COLOR_DARK}`,
        }}
      >
        Upgrade to Premium
      </a>
    </div>
  )
}

export default function StatsPage() {
  const [range, setRange] = useState<Range>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { data: householdData } = useQuery({
    queryKey: ['household-me'],
    queryFn: async () => {
      const r = await fetch('/api/household/me')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 60_000,
  })

  const isPremium = householdData?.household?.subscriptionStatus === 'premium'
  const isAdmin = householdData?.role === 'admin'
  const visibility = householdData?.household?.statsVisibility ?? {
    leaderboard: true, chores: true, expenses: true, tasks: true, meals: true, grocery: true,
  }

  const { start, end } = getDateRange(range, customStart, customEnd)
  const isCustomReady = range !== 'custom' || (customStart && customEnd)

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['stats', range, customStart, customEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ start, end })
      const r = await fetch(`/api/stats?${params}`)
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    enabled: isPremium && isCustomReady,
    staleTime: 60_000,
  })

  if (!householdData) {
    return (
      <div style={{ padding: '20px 16px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', marginBottom: 10 }} />
        ))}
      </div>
    )
  }

  if (!isPremium) return <PremiumGate />

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ paddingBottom: 100 }}
    >
      {/* Page header */}
      <div style={{ padding: '20px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>Stats</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>How the household is doing</p>
        </div>
      </div>

      {/* Date range pills */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {(['7d', '30d', '90d', 'year', 'custom'] as Range[]).map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: range === r ? 'none' : '1.5px solid var(--roost-border)',
              backgroundColor: range === r ? COLOR : 'var(--roost-surface)',
              color: range === r ? '#fff' : 'var(--roost-text-muted)',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {range === 'custom' && (
        <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8 }}>
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            style={{
              flex: 1,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border)',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: 'var(--roost-surface)',
              color: 'var(--roost-text-primary)',
            }}
          />
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            style={{
              flex: 1,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border)',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: 'var(--roost-surface)',
              color: 'var(--roost-text-primary)',
            }}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ padding: '12px 16px 0' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', marginBottom: 10 }} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)', margin: 0 }}>Something went wrong.</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', margin: 0 }}>Could not load stats.</p>
          <button type="button" onClick={() => refetch()} style={{ padding: '8px 20px', borderRadius: 10, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {stats && !isLoading && (
        <>
          {/* Summary chips */}
          <div style={{ paddingTop: 12 }}>
            <StatsSummaryRow
              choresDone={stats.chores.totalCompletions}
              totalSpent={stats.expenses.totalSpent}
              tasksDone={stats.tasks.totalCompleted}
              mealsPlanned={stats.meals.totalPlanned}
            />
          </div>

          {/* Leaderboard */}
          {visibility.leaderboard && (
            <StatsLeaderboard members={stats.chores.leaderboard} />
          )}

          {/* Breakdown label */}
          <div style={{ padding: '0 16px 8px' }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: COLOR, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Breakdown
            </p>
          </div>

          {/* Chart cards */}
          <div style={{ padding: '0 16px' }}>
            {visibility.chores && (
              <ChoreChart
                data={stats.chores.completionsOverTime}
                mostCompletedChore={stats.chores.mostCompletedChore}
              />
            )}
            {visibility.expenses && (
              <ExpenseCharts
                byCategory={stats.expenses.byCategory}
                overTime={stats.expenses.overTime}
                totalSpent={stats.expenses.totalSpent}
              />
            )}
            {visibility.tasks && (
              <TaskChart
                byPriority={stats.tasks.byPriority}
                completionRate={stats.tasks.completionRate}
              />
            )}
            {visibility.meals && (
              <MealChart
                topMeals={stats.meals.topMeals}
                totalPlanned={stats.meals.totalPlanned}
              />
            )}
            {visibility.grocery && (
              <GroceryChart
                itemsAdded={stats.grocery.itemsAdded}
                itemsChecked={stats.grocery.itemsChecked}
                checkRate={stats.grocery.checkRate}
              />
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to `/stats` while:
- Logged in as a free user: should see the PremiumGate block with upgrade button
- Logged in as a premium user: should see the full stats page with date pills, chips, leaderboard, and chart cards

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(app)/stats/page.tsx
git commit -m "feat(stats): build full stats page with date range, leaderboard, and 6 chart cards"
```

---

## Task 11: Settings Stats Visibility Section

**Files:**
- Modify: `apps/web/src/app/(app)/settings/page.tsx`

Admin-only section at the bottom of settings. Six toggle rows (leaderboard, chores, expenses, tasks, meals, grocery). Calls `PATCH /api/household/[id]` on each change, invalidates `household-me` query.

- [ ] **Step 1: Read the current settings page structure**

Open `apps/web/src/app/(app)/settings/page.tsx` to find the last `Section` block and the existing query patterns. Note the `householdData` query key and household ID field.

- [ ] **Step 2: Add StatsVisibilitySection near the bottom of settings (before the sign-out section)**

Add this component inside the settings file:

```typescript
function StatsVisibilitySection({
  householdId,
  visibility,
  onToggle,
}: {
  householdId: string
  visibility: Record<string, boolean>
  onToggle: (key: string, value: boolean) => void
}) {
  const TOGGLES: { key: string; label: string }[] = [
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'chores',      label: 'Chores chart' },
    { key: 'expenses',    label: 'Expenses charts' },
    { key: 'tasks',       label: 'Tasks chart' },
    { key: 'meals',       label: 'Meals chart' },
    { key: 'grocery',     label: 'Grocery chart' },
  ]

  return (
    <Section title="Stats visibility">
      <Card>
        {TOGGLES.map((t, i) => (
          <div
            key={t.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: i < TOGGLES.length - 1 ? '1px solid var(--roost-border)' : 'none',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--roost-text-secondary)' }}>
              {t.label}
            </span>
            <button
              type="button"
              onClick={() => onToggle(t.key, !visibility[t.key])}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                backgroundColor: visibility[t.key] ? '#6366F1' : 'var(--roost-border)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 2,
                left: visibility[t.key] ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        ))}
      </Card>
    </Section>
  )
}
```

Then wire it into the page by:
1. Adding `statsVisibility` to the existing `householdData` query (it's already returned after Task 3)
2. Extracting `householdId = householdData?.household?.id`
3. Adding a `handleVisibilityToggle` async function that calls `PATCH /api/household/${householdId}` with the updated `statsVisibility` object and invalidates `['household-me']`
4. Rendering `<StatsVisibilitySection ... />` inside `{isAdmin && (...)}` near the bottom of the page

```typescript
// Add near other handlers in the settings page:
async function handleVisibilityToggle(key: string, value: boolean) {
  const current = householdData?.household?.statsVisibility ?? {
    leaderboard: true, chores: true, expenses: true, tasks: true, meals: true, grocery: true,
  }
  const updated = { ...current, [key]: value }
  await fetch(`/api/household/${householdData.household.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statsVisibility: updated }),
  })
  qc.invalidateQueries({ queryKey: ['household-me'] })
}
```

- [ ] **Step 3: Verify the toggles work**

1. As an admin, navigate to Settings and scroll to the Stats visibility section
2. Toggle "Leaderboard" off
3. Navigate to `/stats` and confirm the leaderboard is hidden
4. Toggle it back on and confirm it reappears

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/settings/page.tsx
git commit -m "feat(stats): add admin Stats visibility toggles to settings page"
```

---

## Task 12: E2E Test

**Files:**
- Modify: `apps/web/e2e/phase1.spec.ts`

Add a test that verifies the premium gate shows for non-premium users on `/stats`.

- [ ] **Step 1: Add stats premium gate test**

In `e2e/phase1.spec.ts`, add a new test block:

```typescript
test('stats page shows premium gate for free users', async ({ page }) => {
  // Sign in as a free user (use existing sign-in helper or credentials)
  // Navigate to stats
  await page.goto('/stats')
  await page.waitForLoadState('networkidle')

  // Expect the premium gate to appear
  await expect(page.getByText('Stats is a Premium feature')).toBeVisible()
  await expect(page.getByText('Upgrade to Premium')).toBeVisible()

  // Should NOT see date range pills or chart content
  await expect(page.getByText('7 days')).not.toBeVisible()
})
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx playwright test --grep "stats page"
```

Confirm the test passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/phase1.spec.ts
git commit -m "test(stats): add Playwright test for stats premium gate"
```

---

## Execution Choice

**Option A: Subagent-Driven Execution (recommended)**

Spawn a subagent with the instructions to execute this plan task-by-task:

> Read `docs/superpowers/plans/2026-05-06-stats-page.md` and execute each task in order, marking steps complete as you go. Commit after each task.

**Option B: Inline Execution**

Work through the tasks in this conversation, one task at a time. Confirm each commit before moving to the next.
