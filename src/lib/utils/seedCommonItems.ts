// src/lib/utils/seedCommonItems.ts
import { db } from '@/lib/db'
import { commonItems } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_COMMON_ITEMS } from '@/lib/constants/commonItems'

/**
 * Idempotent seed for the twelve default common items.
 * Only inserts when the household has ZERO total rows in common_items —
 * including soft-deleted — so a household that has deleted every default
 * is not re-seeded next time someone opens the manage sheet.
 *
 * Safe to call from both the household create flow and the GET handler.
 */
export async function seedCommonItems(householdId: string): Promise<void> {
  const existing = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(eq(commonItems.householdId, householdId))
    .limit(1)
  if (existing.length > 0) return

  await db.insert(commonItems).values(
    DEFAULT_COMMON_ITEMS.map((name) => ({ householdId, name }))
  )
}
