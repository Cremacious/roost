import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users, choreCompletions, tasks, householdActivity } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [profile, completions, userTasks, activity] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).then(r => r[0] ?? null),
    db.select().from(choreCompletions).where(eq(choreCompletions.userId, userId)),
    db.select().from(tasks).where(eq(tasks.createdBy, userId)),
    db.select().from(householdActivity).where(eq(householdActivity.userId, userId)),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: profile
      ? {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          timezone: profile.timezone,
          language: profile.language,
          avatarColor: profile.avatarColor,
          createdAt: profile.createdAt,
        }
      : null,
    choreCompletions: completions.map(c => ({
      choreId: c.choreId,
      completedAt: c.completedAt,
    })),
    tasks: userTasks.map(t => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      dueDate: t.dueDate,
      priority: t.priority,
      createdAt: t.createdAt,
    })),
    activityLog: activity.map(a => ({
      type: a.type,
      description: a.description,
      createdAt: a.createdAt,
    })),
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="roost-data-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
