import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expense_budgets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { format } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
  const { householdId } = membership;
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(expense_budgets)
    .where(and(eq(expense_budgets.id, id), eq(expense_budgets.household_id, householdId)))
    .limit(1);
  if (!existing) return Response.json({ error: "Budget not found" }, { status: 404 });

  const [updated] = await db
    .update(expense_budgets)
    .set({
      period_start: format(new Date(), "yyyy-MM-dd"),
      last_reset_at: new Date(),
    })
    .where(eq(expense_budgets.id, id))
    .returning();

  return Response.json({ budget: updated });
}
