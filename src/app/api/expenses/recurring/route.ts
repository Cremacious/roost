import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { recurring_expense_templates, households, user } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { format } from "date-fns";

// ---- Shared helper ----------------------------------------------------------

export function advanceRecurringDate(from: string, frequency: string): string {
  // Parse as local date to avoid UTC-offset drift
  const [y, m, d] = from.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return format(date, "yyyy-MM-dd");
}

// ---- GET: list all templates for household ----------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role === "child") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { householdId } = membership;

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required" }, { status: 403 });
  }

  const templates = await db
    .select({
      id: recurring_expense_templates.id,
      title: recurring_expense_templates.title,
      category: recurring_expense_templates.category,
      notes: recurring_expense_templates.notes,
      total_amount: recurring_expense_templates.total_amount,
      frequency: recurring_expense_templates.frequency,
      next_due_date: recurring_expense_templates.next_due_date,
      last_posted_at: recurring_expense_templates.last_posted_at,
      paused: recurring_expense_templates.paused,
      splits: recurring_expense_templates.splits,
      created_by: recurring_expense_templates.created_by,
      created_at: recurring_expense_templates.created_at,
    })
    .from(recurring_expense_templates)
    .where(
      and(
        eq(recurring_expense_templates.household_id, householdId),
        isNull(recurring_expense_templates.deleted_at)
      )
    )
    .orderBy(recurring_expense_templates.created_at);

  return Response.json({ templates });
}

// ---- POST: create new template ----------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

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

  let body: {
    title?: string;
    category?: string;
    notes?: string;
    totalAmount?: number;
    frequency?: string;
    startDate?: string;
    splits?: { userId: string; amount: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!body.totalAmount || body.totalAmount <= 0) return Response.json({ error: "Amount must be greater than 0" }, { status: 400 });
  if (!body.frequency || !["weekly", "biweekly", "monthly", "yearly"].includes(body.frequency)) {
    return Response.json({ error: "Invalid frequency" }, { status: 400 });
  }
  if (!body.splits || body.splits.length === 0) return Response.json({ error: "Splits required" }, { status: 400 });

  const startDate = body.startDate ?? format(new Date(), "yyyy-MM-dd");

  const [template] = await db
    .insert(recurring_expense_templates)
    .values({
      household_id: householdId,
      created_by: session.user.id,
      title: body.title.trim(),
      category: body.category?.trim() || null,
      notes: body.notes?.trim() || null,
      total_amount: body.totalAmount.toFixed(2),
      frequency: body.frequency,
      next_due_date: startDate,
      splits: body.splits,
    })
    .returning();

  const freqLabels: Record<string, string> = {
    weekly: "weekly", biweekly: "biweekly", monthly: "monthly", yearly: "yearly",
  };

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "recurring_expense_created",
    description: `set up recurring ${template.title} (${freqLabels[template.frequency] ?? template.frequency})`,
    entityId: template.id,
    entityType: "expense",
  });

  return Response.json({ template }, { status: 201 });
}
