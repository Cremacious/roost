import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meal_plan_slots, meals, users, member_permissions } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { addDays, format, startOfWeek } from "date-fns";

// ---- GET --------------------------------------------------------------------

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
  const { householdId } = membership;

  const url = new URL(request.url);
  const weekStartParam = url.searchParams.get("weekStart");

  const weekStart = weekStartParam
    ? new Date(weekStartParam + "T00:00:00")
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const slots = await db
    .select({
      id: meal_plan_slots.id,
      slot_date: meal_plan_slots.slot_date,
      slot_type: meal_plan_slots.slot_type,
      meal_id: meal_plan_slots.meal_id,
      custom_meal_name: meal_plan_slots.custom_meal_name,
      meal_name: meals.name,
      meal_description: meals.description,
      meal_ingredients: meals.ingredients,
      assigned_by: meal_plan_slots.assigned_by,
      assigned_by_name: users.name,
      assigned_by_avatar: users.avatar_color,
    })
    .from(meal_plan_slots)
    .leftJoin(meals, eq(meal_plan_slots.meal_id, meals.id))
    .leftJoin(users, eq(meal_plan_slots.assigned_by, users.id))
    .where(
      and(
        eq(meal_plan_slots.household_id, householdId),
        gte(meal_plan_slots.slot_date, weekStartStr),
        lte(meal_plan_slots.slot_date, weekEndStr)
      )
    );

  return Response.json({ slots, weekStart: weekStartStr, weekEnd: weekEndStr });
}

// ---- POST -------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
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

  // Check meals.plan permission
  const [perm] = await db
    .select()
    .from(member_permissions)
    .where(
      and(
        eq(member_permissions.household_id, householdId),
        eq(member_permissions.user_id, session.user.id),
        eq(member_permissions.permission, "meals.plan")
      )
    )
    .limit(1);

  // Permission defaults to enabled if no row exists
  if (perm && !perm.enabled) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    slot_date?: string;
    slot_type?: string;
    meal_id?: string | null;
    custom_meal_name?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.slot_date) {
    return Response.json({ error: "slot_date is required" }, { status: 400 });
  }
  if (!body.slot_type) {
    return Response.json({ error: "slot_type is required" }, { status: 400 });
  }
  if (!body.meal_id && !body.custom_meal_name?.trim()) {
    return Response.json({ error: "meal_id or custom_meal_name is required" }, { status: 400 });
  }

  const [slot] = await db
    .insert(meal_plan_slots)
    .values({
      household_id: householdId,
      meal_id: body.meal_id || null,
      custom_meal_name: body.custom_meal_name?.trim() || null,
      slot_date: body.slot_date,
      slot_type: body.slot_type,
      assigned_by: session.user.id,
    })
    .onConflictDoUpdate({
      target: [meal_plan_slots.household_id, meal_plan_slots.slot_date, meal_plan_slots.slot_type],
      set: {
        meal_id: body.meal_id || null,
        custom_meal_name: body.custom_meal_name?.trim() || null,
        assigned_by: session.user.id,
      },
    })
    .returning();

  // Get meal name for activity log
  let mealDisplayName = body.custom_meal_name?.trim() ?? "a meal";
  if (body.meal_id) {
    const [m] = await db.select({ name: meals.name }).from(meals).where(eq(meals.id, body.meal_id)).limit(1);
    if (m) mealDisplayName = m.name;
  }

  const dayLabel = format(new Date(body.slot_date + "T00:00:00"), "EEEE");
  await logActivity({
    householdId,
    userId: session.user.id,
    type: "meal_planned",
    description: `planned ${mealDisplayName} for ${dayLabel}`,
    entityId: slot.id,
    entityType: "meal_plan_slot",
  });

  return Response.json({ slot }, { status: 201 });
}
