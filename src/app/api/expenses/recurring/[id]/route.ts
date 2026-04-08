import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { recurring_expense_templates, expenses, households } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- PATCH: update template -------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  const { householdId } = membership;

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required" }, { status: 403 });
  }

  const [existing] = await db
    .select({ id: recurring_expense_templates.id, household_id: recurring_expense_templates.household_id })
    .from(recurring_expense_templates)
    .where(and(eq(recurring_expense_templates.id, id), isNull(recurring_expense_templates.deleted_at)))
    .limit(1);

  if (!existing) return Response.json({ error: "Template not found" }, { status: 404 });
  if (existing.household_id !== householdId) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    paused?: boolean;
    title?: string;
    notes?: string;
    frequency?: string;
    totalAmount?: number;
    splits?: { userId: string; amount: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Partial<typeof recurring_expense_templates.$inferInsert> = {
    updated_at: new Date(),
  };
  if (body.paused !== undefined) updates.paused = body.paused;
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.notes !== undefined) updates.notes = body.notes.trim() || null;
  if (body.frequency !== undefined && ["weekly", "biweekly", "monthly", "yearly"].includes(body.frequency)) {
    updates.frequency = body.frequency;
  }
  if (body.totalAmount !== undefined && body.totalAmount > 0) {
    updates.total_amount = body.totalAmount.toFixed(2);
  }
  if (body.splits !== undefined && body.splits.length > 0) {
    updates.splits = body.splits;
  }

  const [updated] = await db
    .update(recurring_expense_templates)
    .set(updates)
    .where(eq(recurring_expense_templates.id, id))
    .returning();

  return Response.json({ template: updated });
}

// ---- DELETE: soft-delete template, unlink expenses --------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  const { householdId } = membership;

  const [existing] = await db
    .select({ id: recurring_expense_templates.id, household_id: recurring_expense_templates.household_id })
    .from(recurring_expense_templates)
    .where(and(eq(recurring_expense_templates.id, id), isNull(recurring_expense_templates.deleted_at)))
    .limit(1);

  if (!existing) return Response.json({ error: "Template not found" }, { status: 404 });
  if (existing.household_id !== householdId) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Soft-delete the template
  await db
    .update(recurring_expense_templates)
    .set({ deleted_at: new Date() })
    .where(eq(recurring_expense_templates.id, id));

  // Unlink expenses from this template (keep history, just remove the link)
  await db
    .update(expenses)
    .set({ recurring_template_id: null })
    .where(eq(expenses.recurring_template_id, id));

  return Response.json({ success: true });
}
