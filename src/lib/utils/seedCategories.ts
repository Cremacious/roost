import { db } from "@/lib/db";
import { expense_categories } from "@/db/schema";

export const DEFAULT_CATEGORIES = [
  { name: "Rent", icon: "Home", color: "#EF4444" },
  { name: "Electric", icon: "Zap", color: "#F59E0B" },
  { name: "Internet", icon: "Wifi", color: "#3B82F6" },
  { name: "Phone", icon: "Phone", color: "#8B5CF6" },
  { name: "Grocery", icon: "ShoppingCart", color: "#22C55E" },
  { name: "Restaurant", icon: "UtensilsCrossed", color: "#F97316" },
  { name: "Transport", icon: "Car", color: "#06B6D4" },
  { name: "Health", icon: "Heart", color: "#EC4899" },
  { name: "Entertainment", icon: "Tv", color: "#A855F7" },
  { name: "Other", icon: "Receipt", color: "#6B7280" },
] as const;

export async function seedDefaultCategories(householdId: string): Promise<void> {
  await db.insert(expense_categories).values(
    DEFAULT_CATEGORIES.map((c) => ({
      household_id: householdId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      is_default: true,
      is_custom: false,
      status: "active" as const,
    }))
  );
}
