import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { expense_budgets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { format, startOfMonth } from "date-fns";

export async function GET(request: NextRequest): Promise<Response> {
  const secret = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periodStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const result = await db
    .update(expense_budgets)
    .set({
      period_start: periodStart,
      last_reset_at: new Date(),
    })
    .where(eq(expense_budgets.reset_type, "monthly"))
    .returning({ id: expense_budgets.id });

  return Response.json({ reset: result.length });
}
