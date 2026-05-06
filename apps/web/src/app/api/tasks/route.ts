import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, users, householdMembers } from '@/db/schema'
import { eq, and, isNull, asc, desc } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      assignedTo: tasks.assignedTo,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      completed: tasks.completed,
      completedBy: tasks.completedBy,
      completedAt: tasks.completedAt,
      createdBy: tasks.createdBy,
      createdAt: tasks.createdAt,
      assigneeName: users.name,
      assigneeAvatar: users.avatarColor,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))

  return NextResponse.json({ tasks: rows })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.role === 'child') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { householdId } = membership
  const body = await req.json()
  const { title, description, assignedTo, dueDate, priority } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const [task] = await db
    .insert(tasks)
    .values({
      householdId,
      title: title.trim(),
      description: description?.trim() ?? null,
      assignedTo: assignedTo ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority ?? 'medium',
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ task }, { status: 201 })
}
