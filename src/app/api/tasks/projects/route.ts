import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { projects, tasks } from '@/db/schema'
import { eq, and, isNull, count } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      archived: projects.archived,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(
      eq(projects.householdId, householdId),
      isNull(projects.deletedAt),
    ))
    .orderBy(projects.createdAt)

  // Task counts per project
  const counts = await db
    .select({ projectId: tasks.projectId, cnt: count(tasks.id) })
    .from(tasks)
    .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)))
    .groupBy(tasks.projectId)

  const countMap = Object.fromEntries(counts.map(c => [c.projectId, Number(c.cnt)]))
  const result = rows.map(p => ({ ...p, taskCount: countMap[p.id] ?? 0 }))

  return NextResponse.json({ projects: result })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.role === 'child') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { householdId, isPremium } = membership as typeof membership & { isPremium?: boolean }
  const body = await req.json()
  const { name, color } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Check project limit for free tier
  const [{ cnt }] = await db
    .select({ cnt: count(projects.id) })
    .from(projects)
    .where(and(eq(projects.householdId, householdId), isNull(projects.deletedAt)))

  const limit = 3
  if (Number(cnt) >= limit) {
    return NextResponse.json(
      { error: 'Project limit reached', code: 'TASKS_PROJECTS_LIMIT', limit, current: Number(cnt) },
      { status: 403 }
    )
  }

  const [project] = await db
    .insert(projects)
    .values({
      householdId,
      createdBy: session.user.id,
      name: name.trim(),
      color: color ?? '#EC4899',
    })
    .returning()

  return NextResponse.json({ project }, { status: 201 })
}
