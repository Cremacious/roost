import { db } from "@/lib/db";
import { household_activity } from "@/db/schema";

interface LogActivityParams {
  householdId: string;
  userId: string;
  type: string;
  description: string;
  entityId?: string;
  entityType?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.insert(household_activity).values({
      household_id: params.householdId,
      user_id: params.userId,
      type: params.type,
      description: params.description,
      entity_id: params.entityId,
      entity_type: params.entityType,
    });
  } catch {
    // Activity logging must never break the main flow
  }
}
