import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meal_plan_slots, meal_suggestions, meals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { format } from "date-fns";

// ---- POST -------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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
  if (membership.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }
  const { householdId } = membership;

  const [suggestion] = await db
    .select()
    .from(meal_suggestions)
    .where(and(eq(meal_suggestions.id, id), eq(meal_suggestions.household_id, householdId)))
    .limit(1);

  if (!suggestion) {
    return Response.json({ error: "Suggestion not found" }, { status: 404 });
  }
  if (suggestion.status !== "suggested") {
    return Response.json({ error: "Suggestion has already been processed" }, { status: 409 });
  }

  let body: {
    slot_date?: string;
    slot_type?: string;
    destination?: "planner" | "bank";
  } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const destination = body.destination ?? "planner";
  const slotDate = body.slot_date ?? suggestion.target_slot_date;
  const slotType =
    body.slot_type ?? suggestion.target_slot_type ?? suggestion.category ?? "dinner";

  if (destination === "planner" && !slotDate) {
    return Response.json(
      { error: "slot_date is required to accept a suggestion" },
      { status: 400 }
    );
  }

  const [meal] = await db
    .insert(meals)
    .values({
      household_id: householdId,
      name: suggestion.meal_name,
      description: suggestion.note,
      category: suggestion.category ?? "dinner",
      prep_time: suggestion.prep_time ?? null,
      ingredients: suggestion.ingredients ?? null,
      created_by: suggestion.suggested_by,
    })
    .returning();

  let slot = null;
  if (destination === "planner" && slotDate) {
    [slot] = await db
      .insert(meal_plan_slots)
      .values({
        household_id: householdId,
        meal_id: meal.id,
        custom_meal_name: null,
        slot_date: slotDate,
        slot_type: slotType,
        assigned_by: session.user.id,
      })
      .onConflictDoUpdate({
        target: [meal_plan_slots.household_id, meal_plan_slots.slot_date, meal_plan_slots.slot_type],
        set: {
          meal_id: meal.id,
          custom_meal_name: null,
          assigned_by: session.user.id,
        },
      })
      .returning();
  }

  const [updated] = await db
    .update(meal_suggestions)
    .set({
      status: destination === "bank" ? "in_bank" : "accepted",
      target_slot_date: destination === "planner" ? slotDate : suggestion.target_slot_date,
      target_slot_type: destination === "planner" ? slotType : suggestion.target_slot_type,
      responded_by: session.user.id,
      responded_at: new Date(),
      accepted_meal_id: meal.id,
      accepted_slot_id: slot?.id ?? null,
      updated_at: new Date(),
    })
    .where(eq(meal_suggestions.id, id))
    .returning();

  if (slotDate && slot) {
    const dayLabel = format(new Date(`${slotDate}T00:00:00`), "EEEE");
    await logActivity({
      householdId,
      userId: session.user.id,
      type: "meal_planned",
      description: `accepted ${suggestion.meal_name} for ${dayLabel} ${slotType}`,
      entityId: slot.id,
      entityType: "meal_plan_slot",
    });
  }

  return Response.json({ suggestion: updated, meal, slot });
}
