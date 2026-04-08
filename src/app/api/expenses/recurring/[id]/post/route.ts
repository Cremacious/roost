import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { recurring_expense_templates, expenses, expense_splits, households, household_members, notification_queue } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
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

  let body: { totalAmount?: number; adjustedSplits?: { userId: string; amount: number }[] } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const totalAmount = body.totalAmount ?? parseFloat(template.total_amount ?? "0");
  const splitsToUse = body.adjustedSplits ?? (template.splits as { userId: string; amount: number }[]);

  // Check for an existing draft to convert, otherwise create fresh
  const [existingDraft] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(
      and(
        eq(expenses.recurring_template_id, id),
        eq(expenses.is_recurring_draft, true),
        isNull(expenses.deleted_at)
      )
    )
    .limit(1);

  let expense: typeof expenses.$inferSelect;
  if (existingDraft) {
    // Convert existing draft to a real expense
    [expense] = await db
      .update(expenses)
      .set({
        is_recurring_draft: false,
        total_amount: totalAmount.toFixed(2),
        updated_at: new Date(),
      })
      .where(eq(expenses.id, existingDraft.id))
      .returning();

    // If splits were adjusted, delete old ones and re-insert
    if (body.adjustedSplits) {
      await db.delete(expense_splits).where(eq(expense_splits.expense_id, expense.id));
      await db.insert(expense_splits).values(
        splitsToUse.map((s) => ({
          expense_id: expense.id,
          user_id: s.userId,
          amount: s.amount.toFixed(2),
        }))
      );
    }
  } else {
    // Create fresh expense from template
    [expense] = await db
      .insert(expenses)
      .values({
        household_id: householdId,
        title: template.title,
        total_amount: totalAmount.toFixed(2),
        paid_by: template.created_by,
        category: template.category,
        recurring_template_id: id,
        is_recurring_draft: false,
      })
      .returning();

    await db.insert(expense_splits).values(
      splitsToUse.map((s) => ({
        expense_id: expense.id,
        user_id: s.userId,
        amount: s.amount.toFixed(2),
      }))
    );
  }

  // Advance template next_due_date
  const today = format(new Date(), "yyyy-MM-dd");
  const nextDue = advanceRecurringDate(template.next_due_date, template.frequency);
  await db
    .update(recurring_expense_templates)
    .set({ next_due_date: nextDue, last_posted_at: today, updated_at: new Date() })
    .where(eq(recurring_expense_templates.id, id));

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "recurring_expense_posted",
    description: `posted recurring ${template.title} ($${totalAmount.toFixed(2)})`,
    entityId: expense.id,
    entityType: "expense",
  });

  // Notify all household members
  const members = await db
    .select({ user_id: household_members.user_id })
    .from(household_members)
    .where(eq(household_members.household_id, householdId));

  for (const m of members) {
    await db.insert(notification_queue).values({
      user_id: m.user_id,
      type: "recurring_expense_posted",
      title: "New expense posted",
      body: `${template.title} ($${totalAmount.toFixed(2)}) has been added and split between you.`,
    }).catch(() => {});
  }

  return Response.json({ expense });
}
