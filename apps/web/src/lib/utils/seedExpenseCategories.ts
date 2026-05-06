import { db } from '@/lib/db'
import { expenseCategories } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

const DEFAULTS = [
  { name: 'Groceries', icon: 'ShoppingCart', color: '#22C55E' },
  { name: 'Dining', icon: 'Utensils', color: '#F97316' },
  { name: 'Utilities', icon: 'Zap', color: '#3B82F6' },
  { name: 'Rent', icon: 'Home', color: '#8B5CF6' },
  { name: 'Transportation', icon: 'Car', color: '#EC4899' },
  { name: 'Entertainment', icon: 'Tv', color: '#F59E0B' },
  { name: 'Healthcare', icon: 'Heart', color: '#EF4444' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#06B6D4' },
  { name: 'Travel', icon: 'Plane', color: '#10B981' },
  { name: 'Other', icon: 'DollarSign', color: '#9CA3AF' },
]

export async function seedExpenseCategories(householdId: string) {
  const existing = await db
    .select({ name: expenseCategories.name })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.householdId, householdId), eq(expenseCategories.isDefault, true)))

  if (existing.length >= DEFAULTS.length) return

  const existingNames = new Set(existing.map(e => e.name))
  const toInsert = DEFAULTS.filter(d => !existingNames.has(d.name))

  if (!toInsert.length) return

  await db.insert(expenseCategories).values(
    toInsert.map(d => ({
      id: crypto.randomUUID(),
      householdId,
      name: d.name,
      icon: d.icon,
      color: d.color,
      isDefault: true,
      isCustom: false,
    }))
  )
}
