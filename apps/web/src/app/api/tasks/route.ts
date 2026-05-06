import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, projects, taskComments, taskDelegations, users } from '@/db/schema'
import { eq, and, isNull, asc, desc, count, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const filter = searchParams.get('filter') // 'mine' | 'assigned' | 'today'

  const conditions = [eq(tasks.householdId, householdId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)]
  if (projectId) conditions.push(eq(tasks.projectId, projectId))
  if (filter === 'mine') conditions.push(eq(tasks.createdBy, session.user.id))
  if (filter === 'assigned') conditions.push(eq(tasks.assignedTo, session.user.id))
  if (filter === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(); end.setHours(23, 59, 59, 999)
    conditions.push(sql`${tasks.dueDate} >= ${start} AND ${tasks.dueDate} <= ${end}`)
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      projectId: tasks.projectId,
      assignedTo: tasks.assignedTo,
      dueDate: tasks.dueDate,
      dueTime: tasks.dueTime,
      priority: tasks.priority,
      recurring: tasks.recurring,
      frequency: tasks.frequency,
      repeatEndType: tasks.repeatEndType,
      repeatUntil: tasks.repeatUntil,
      repeatOccurrences: tasks.repeatOccurrences,
      completed: tasks.completed,
      completedBy: tasks.completedBy,
      completedAt: tasks.completedAt,
      createdBy: tasks.createdBy,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeName: users.name,
      assigneeAvatar: users.avatarColor,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))

  // Fetch subtasks for all returned tasks
  const taskIds = rows.map(r => r.id)
  const subtaskRows = taskIds.length > 0
    ? await db
        .select({
          id: tasks.id,
          parentTaskId: tasks.parentTaskId,
          title: tasks.title,
          completed: tasks.completed,
          completedAt: tasks.completedAt,
          assignedTo: tasks.assignedTo,
          createdBy: tasks.createdBy,
          dueDate: tasks.dueDate,
          priority: tasks.priority,
        })
        .from(tasks)
        .where(and(
          eq(tasks.householdId, householdId),
          isNull(tasks.deletedAt),
          sql`${tasks.parentTaskId} = ANY(ARRAY[${sql.raw(taskIds.map(id => `'${id}'`).join(','))}]::text[])`
        ))
    : []

  // Fetch comment counts
  const commentCounts = taskIds.length > 0
    ? await db
        .select({
          taskId: taskComments.taskId,
          cnt: count(taskComments.id),
        })
        .from(taskComments)
        .where(and(
          isNull(taskComments.deletedAt),
          sql`${taskComments.taskId} = ANY(ARRAY[${sql.raw(taskIds.map(id => `'${id}'`).join(','))}]::text[])`
        ))
        .groupBy(taskComments.taskId)
    : []

  // Fetch pending delegations for current user
  const pendingDelegations = await db
    .select({
      id: taskDelegations.id,
      taskId: taskDelegations.taskId,
      fromUserId: taskDelegations.fromUserId,
      toUserId: taskDelegations.toUserId,
      status: taskDelegations.status,
      createdAt: taskDelegations.createdAt,
    })
    .from(taskDelegations)
    .where(and(
      eq(taskDelegations.householdId, householdId),
      eq(taskDelegations.toUserId, session.user.id),
      eq(taskDelegations.status, 'pending'),
    ))

  // Fetch project info
  const projectRows = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(and(eq(projects.householdId, householdId), isNull(projects.deletedAt)))

  const projectMap = Object.fromEntries(projectRows.map(p => [p.id, p]))
  const commentMap = Object.fromEntries(commentCounts.map(c => [c.taskId, Number(c.cnt)]))
  const subtaskMap: Record<string, typeof subtaskRows> = {}
  for (const s of subtaskRows) {
    if (!s.parentTaskId) continue
    if (!subtaskMap[s.parentTaskId]) subtaskMap[s.parentTaskId] = []
    subtaskMap[s.parentTaskId].push(s)
  }

  const result = rows.map(row => ({
    ...row,
    project: row.projectId ? (projectMap[row.projectId] ?? null) : null,
    subtasks: subtaskMap[row.id] ?? [],
    commentCount: commentMap[row.id] ?? 0,
  }))

  return NextResponse.json({ tasks: result, pendingDelegations })
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
  const {
    title, description, assignedTo, dueDate, dueTime, priority,
    projectId, parentTaskId,
    recurring, frequency, repeatEndType, repeatUntil, repeatOccurrences,
  } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Depth guard: subtasks cannot themselves have subtasks
  if (parentTaskId) {
    const [parent] = await db.select({ parentTaskId: tasks.parentTaskId })
      .from(tasks).where(eq(tasks.id, parentTaskId)).limit(1)
    if (parent?.parentTaskId) {
      return NextResponse.json({ error: 'Subtasks cannot have subtasks' }, { status: 400 })
    }
  }

  const [task] = await db
    .insert(tasks)
    .values({
      householdId,
      title: title.trim(),
      description: description?.trim() ?? null,
      assignedTo: assignedTo ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      dueTime: dueTime ?? null,
      priority: priority ?? 'medium',
      projectId: projectId ?? null,
      parentTaskId: parentTaskId ?? null,
      recurring: recurring ?? false,
      frequency: frequency ?? null,
      repeatEndType: repeatEndType ?? null,
      repeatUntil: repeatUntil ? new Date(repeatUntil) : null,
      repeatOccurrences: repeatOccurrences ?? null,
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ task }, { status: 201 })
}
