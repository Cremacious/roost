import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { expense_budgets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { format, startOfMonth } from "date-fns";
import { log } from "@/lib/utils/logger";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  log.info("cron/budget-reset.start", { at: now.toISOString() });

  const periodStart = format(startOfMonth(now), "yyyy-MM-dd");

  const result = await db
    .update(expense_budgets)
    .set({
      period_start: periodStart,
      last_reset_at: new Date(),
    })
    .where(eq(expense_budgets.reset_type, "monthly"))
    .returning({ id: expense_budgets.id });

  log.info("cron/budget-reset.done", { reset: result.length, durationMs: Date.now() - startedAt });
  return Response.json({ reset: result.length });
}
