import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, households } from "@/db/schema";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- GET: preview count + total for a date range ----------------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { householdId } = membership;

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  const filters = [eq(expenses.household_id, householdId), isNull(expenses.deleted_at)];
  if (fromStr) {
    const from = new Date(`${fromStr}T00:00:00`);
    if (!isNaN(from.getTime())) filters.push(gte(expenses.created_at, from));
  }
  if (toStr) {
    const to = new Date(`${toStr}T23:59:59`);
    if (!isNaN(to.getTime())) filters.push(lte(expenses.created_at, to));
  }

  const rows = await db
    .select({ total_amount: expenses.total_amount })
    .from(expenses)
    .where(and(...filters));

  const count = rows.length;
  const total = rows.reduce((acc, r) => acc + parseFloat(r.total_amount ?? "0"), 0);

  return Response.json({ count, total: Math.round(total * 100) / 100 });
}
