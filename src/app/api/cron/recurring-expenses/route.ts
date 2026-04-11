import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/utils/logger";
import {
  recurring_expense_templates,
  expenses,
  expense_splits,
  households,
  household_members,
  notification_queue,
} from "@/db/schema";
import { and, eq, isNull, lte, ne, not } from "drizzle-orm";
import { format, subDays } from "date-fns";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  log.info("cron/recurring-expenses.start", { at: now.toISOString() });

  const today = format(now, "yyyy-MM-dd");
  const threeDaysAgo = format(subDays(now, 3), "yyyy-MM-dd");

  // --- PART 1: Create drafts for due templates ---

  const dueTemplates = await db
    .select()
    .from(recurring_expense_templates)
    .where(
      and(
        isNull(recurring_expense_templates.deleted_at),
        eq(recurring_expense_templates.paused, false),
        lte(recurring_expense_templates.next_due_date, today)
      )
    );

  let created = 0;
  let skipped = 0;

  for (const template of dueTemplates) {
    // Skip if household is not premium
    const [household] = await db
      .select({ subscription_status: households.subscription_status })
      .from(households)
      .where(eq(households.id, template.household_id))
      .limit(1);

    if (!household || household.subscription_status !== "premium") {
      skipped++;
      continue;
    }

    // Check if a draft already exists for this template
    const [existingDraft] = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.recurring_template_id, template.id),
          eq(expenses.is_recurring_draft, true),
          isNull(expenses.deleted_at)
        )
      )
      .limit(1);

    if (existingDraft) {
      skipped++;
      continue;
    }

    const splits = template.splits as { userId: string; amount: number }[];
    const totalAmount = parseFloat(template.total_amount ?? "0");

    // Create draft expense
    const [draft] = await db
      .insert(expenses)
      .values({
        household_id: template.household_id,
        title: template.title,
        total_amount: totalAmount.toFixed(2),
        paid_by: template.created_by,
        category: template.category,
        recurring_template_id: template.id,
        is_recurring_draft: true,
      })
      .returning();

    if (splits.length > 0) {
      await db.insert(expense_splits).values(
        splits.map((s) => ({
          expense_id: draft.id,
          user_id: s.userId,
          amount: s.amount.toFixed(2),
        }))
      );
    }

    // Notify household admins
    const admins = await db
      .select({ user_id: household_members.user_id })
      .from(household_members)
      .where(
        and(
          eq(household_members.household_id, template.household_id),
          eq(household_members.role, "admin")
        )
      );

    for (const admin of admins) {
      await db
        .insert(notification_queue)
        .values({
          user_id: admin.user_id,
          type: "recurring_expense_due",
          title: "Recurring expense due",
          body: `${template.title} ($${totalAmount.toFixed(2)}) is ready to post.`,
        })
        .catch(() => {});
    }

    created++;
  }

  // --- PART 2: Remind admins about drafts older than 3 days ---

  const staleDrafts = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      total_amount: expenses.total_amount,
      household_id: expenses.household_id,
      created_at: expenses.created_at,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.is_recurring_draft, true),
        isNull(expenses.deleted_at),
        lte(expenses.created_at, new Date(`${threeDaysAgo}T00:00:00`))
      )
    );

  let reminded = 0;

  for (const draft of staleDrafts) {
    const admins = await db
      .select({ user_id: household_members.user_id })
      .from(household_members)
      .where(
        and(
          eq(household_members.household_id, draft.household_id),
          eq(household_members.role, "admin")
        )
      );

    for (const admin of admins) {
      await db
        .insert(notification_queue)
        .values({
          user_id: admin.user_id,
          type: "recurring_expense_stale",
          title: "Pending recurring expense",
          body: `${draft.title} has been waiting to be posted for over 3 days.`,
        })
        .catch(() => {});
    }

    reminded++;
  }

  log.info("cron/recurring-expenses.done", { created, skipped, reminded, durationMs: Date.now() - startedAt });
  return Response.json({ created, skipped, reminded });
}
