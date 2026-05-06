import { db } from '@/lib/db'
import { householdActivity } from '@/db/schema'

interface LogActivityParams {
  householdId: string
  userId: string
  type: string
  entityId?: string
  entityType?: string
  description: string
}

export async function logActivity(params: LogActivityParams) {
  try {
    await db.insert(householdActivity).values({
      householdId: params.householdId,
      userId: params.userId,
      type: params.type,
      entityId: params.entityId ?? null,
      entityType: params.entityType ?? null,
      description: params.description,
    })
  } catch {
    // Activity logging is non-critical — never throw
  }
}
