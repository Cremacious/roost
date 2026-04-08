import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { recurring_expense_templates, expenses, households } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { advanceRecurringDate } from "@/app/api/expenses/recurring/route";
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

  const [template] = await db
    .select()
    .from(recurring_expense_templates)
    .where(and(eq(recurring_expense_templates.id, id), isNull(recurring_expense_templates.deleted_at)))
    .limit(1);

  if (!template) return Response.json({ error: "Template not found" }, { status: 404 });
  if (template.household_id !== householdId) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Delete any existing draft for this template
  await db
    .delete(expenses)
    .where(
      and(
        eq(expenses.recurring_template_id, id),
        eq(expenses.is_recurring_draft, true),
        isNull(expenses.deleted_at)
      )
    );

  // Advance template next_due_date without posting
  const today = format(new Date(), "yyyy-MM-dd");
  const nextDue = advanceRecurringDate(template.next_due_date, template.frequency);
  const [updated] = await db
    .update(recurring_expense_templates)
    .set({ next_due_date: nextDue, last_posted_at: today, updated_at: new Date() })
    .where(eq(recurring_expense_templates.id, id))
    .returning();

  return Response.json({ template: updated });
}
