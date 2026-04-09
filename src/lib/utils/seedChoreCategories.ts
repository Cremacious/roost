import { db } from "@/lib/db";
import { chore_categories } from "@/db/schema";
import { eq } from "drizzle-orm";

export const DEFAULT_CHORE_CATEGORIES = [
  { name: "Kitchen",   icon: "UtensilsCrossed", color: "#F97316" },
  { name: "Bathroom",  icon: "Droplets",        color: "#06B6D4" },
  { name: "Bedroom",   icon: "Bed",             color: "#A855F7" },
  { name: "Outdoor",   icon: "Flower2",         color: "#22C55E" },
  { name: "Laundry",   icon: "WashingMachine",  color: "#3B82F6" },
  { name: "Pet Care",  icon: "PawPrint",        color: "#F59E0B" },
  { name: "Errands",   icon: "ShoppingBag",     color: "#EC4899" },
  { name: "Other",     icon: "Package",         color: "#64748B" },
] as const;

export async function seedChoreCategories(
  householdId: string
): Promise<void> {
  // Idempotent: skip if already seeded
  const [existing] = await db
    .select({ id: chore_categories.id })
    .from(chore_categories)
    .where(eq(chore_categories.household_id, householdId))
    .limit(1);

  if (existing) return;

  await db.insert(chore_categories).values(
    DEFAULT_CHORE_CATEGORIES.map((cat) => ({
      household_id: householdId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      is_default: true,
      is_custom: false,
      status: "active" as const,
    }))
  );
}
