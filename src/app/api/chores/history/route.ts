import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores, choreCompletions, users } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { startOfDay, endOfDay } from 'date-fns'
import { FEATURE_ACCESS } from '@/lib/constants/planLimits'

// Parse a "YYYY-MM-DD" query param into a local-time Date.
//
// IMPORTANT (past bug): never pass a date-only ISO string straight to
// `new Date('2026-04-08')` — that parses as UTC midnight, and a later
// setHours() would then apply the local offset, shifting the day on a
// non-UTC server. Appending "T00:00:00" forces local-midnight parsing;
// date-fns startOfDay/endOfDay then give clean local bounds.
function localBound(dateStr: string, edge: 'start' | 'end'): Date | null {
  const parsed = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return edge === 'start' ? startOfDay(parsed) : endOfDay(parsed)
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  // Server-side premium gate. Source of truth: FEATURE_ACCESS.choreHistory.
  const isPremium = membership.household.subscriptionStatus === 'premium'
  if (!FEATURE_ACCESS.choreHistory[isPremium ? 'premium' : 'free']) {
    return NextResponse.json(
      { error: 'Chore history is a premium feature', code: 'CHORE_HISTORY_PREMIUM' },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('memberId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const filters = [eq(choreCompletions.householdId, householdId)]

  if (memberId && memberId !== 'all') {
    filters.push(eq(choreCompletions.userId, memberId))
  }
  if (from) {
    const fromBound = localBound(from, 'start')
    if (fromBound) filters.push(gte(choreCompletions.completedAt, fromBound))
  }
  if (to) {
    const toBound = localBound(to, 'end')
    if (toBound) filters.push(lte(choreCompletions.completedAt, toBound))
  }

  // leftJoin users so a completion is never dropped if the users row is
  // missing (auth databaseHook can lag on first signup). Fall back to
  // "Unknown" for the completer name.
  const rows = await db
    .select({
      id: choreCompletions.id,
      choreId: choreCompletions.choreId,
      choreTitle: chores.title,
      userId: choreCompletions.userId,
      userName: users.name,
      avatarColor: users.avatarColor,
      completedAt: choreCompletions.completedAt,
      points: choreCompletions.points,
    })
    .from(choreCompletions)
    .leftJoin(chores, eq(choreCompletions.choreId, chores.id))
    .leftJoin(users, eq(choreCompletions.userId, users.id))
    .where(and(...filters))
    .orderBy(desc(choreCompletions.completedAt))

  const completions = rows.map((r) => ({
    id: r.id,
    choreId: r.choreId,
    choreTitle: r.choreTitle ?? 'Deleted chore',
    userId: r.userId,
    userName: r.userName ?? 'Unknown',
    avatarColor: r.avatarColor,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    points: r.points,
  }))

  // ── Stats for the selected range ──────────────────────────────────────────
  const totalCompletions = completions.length
  const pointsEarned = completions.reduce((sum, c) => sum + (c.points ?? 0), 0)

  // Most active member (by completion count).
  const memberCounts = new Map<string, { name: string; count: number }>()
  for (const c of completions) {
    const entry = memberCounts.get(c.userId) ?? { name: c.userName, count: 0 }
    entry.count += 1
    memberCounts.set(c.userId, entry)
  }
  let mostActiveMember: { name: string; count: number } | null = null
  for (const entry of memberCounts.values()) {
    if (!mostActiveMember || entry.count > mostActiveMember.count) {
      mostActiveMember = { name: entry.name, count: entry.count }
    }
  }

  // Most completed chore (by completion count).
  const choreCounts = new Map<string, { title: string; count: number }>()
  for (const c of completions) {
    const key = c.choreId
    const entry = choreCounts.get(key) ?? { title: c.choreTitle, count: 0 }
    entry.count += 1
    choreCounts.set(key, entry)
  }
  let mostCompletedChore: { title: string; count: number } | null = null
  for (const entry of choreCounts.values()) {
    if (!mostCompletedChore || entry.count > mostCompletedChore.count) {
      mostCompletedChore = { title: entry.title, count: entry.count }
    }
  }

  return NextResponse.json({
    completions,
    stats: {
      totalCompletions,
      pointsEarned,
      mostActiveMember,
      mostCompletedChore,
    },
  })
}
