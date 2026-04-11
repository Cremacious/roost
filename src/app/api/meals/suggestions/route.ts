import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meal_suggestions, meal_suggestion_votes, users } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";

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

  const suggestionRows = await db
    .select({
      id: meal_suggestions.id,
      meal_name: meal_suggestions.meal_name,
      note: meal_suggestions.note,
      category: meal_suggestions.category,
      prep_time: meal_suggestions.prep_time,
      ingredients: meal_suggestions.ingredients,
      status: meal_suggestions.status,
      target_slot_date: meal_suggestions.target_slot_date,
      target_slot_type: meal_suggestions.target_slot_type,
      suggested_by: meal_suggestions.suggested_by,
      created_at: meal_suggestions.created_at,
      suggester_name: users.name,
      suggester_avatar: users.avatar_color,
    })
    .from(meal_suggestions)
    .leftJoin(users, eq(meal_suggestions.suggested_by, users.id))
    .where(
      and(
        eq(meal_suggestions.household_id, householdId),
        inArray(meal_suggestions.status, ["suggested", "in_bank"])
      )
    )
    .orderBy(desc(meal_suggestions.created_at));

  if (suggestionRows.length === 0) {
    return Response.json({ suggestions: [] });
  }

  const suggestionIds = suggestionRows.map((s) => s.id);
  const votes = await db
    .select()
    .from(meal_suggestion_votes)
    .where(inArray(meal_suggestion_votes.suggestion_id, suggestionIds));

  const suggestions = suggestionRows
    .map((s) => {
      const sVotes = votes.filter((v) => v.suggestion_id === s.id);
      const upvotes = sVotes.filter((v) => v.vote === "up").length;
      const downvotes = sVotes.filter((v) => v.vote === "down").length;
      const userVote = sVotes.find((v) => v.user_id === session.user.id)?.vote ?? null;
      return { ...s, upvotes, downvotes, userVote };
    })
    .sort((a, b) => b.upvotes - a.upvotes);

  return Response.json({ suggestions });
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
  const { householdId } = membership;

  let body: {
    meal_name?: string;
    note?: string;
    category?: string;
    prep_time?: number;
    ingredients?: string[];
    target_slot_date?: string;
    target_slot_type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.meal_name?.trim()) {
    return Response.json({ error: "Meal name is required" }, { status: 400 });
  }
  if (!body.target_slot_date) {
    return Response.json({ error: "target_slot_date is required" }, { status: 400 });
  }
  if (!body.target_slot_type) {
    return Response.json({ error: "target_slot_type is required" }, { status: 400 });
  }

  const filteredIngredients = (body.ingredients ?? []).filter((i) => i.trim());

  const [suggestion] = await db
    .insert(meal_suggestions)
    .values({
      household_id: householdId,
      suggested_by: session.user.id,
      meal_name: body.meal_name.trim(),
      note: body.note?.trim() || null,
      category: body.category ?? "dinner",
      prep_time: body.prep_time ?? null,
      target_slot_date: body.target_slot_date,
      target_slot_type: body.target_slot_type,
      ingredients: filteredIngredients.length > 0 ? JSON.stringify(filteredIngredients) : null,
      status: "suggested",
    })
    .returning();

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "meal_suggested",
    description: `suggested ${body.meal_name.trim()}`,
    entityId: suggestion.id,
    entityType: "meal_suggestion",
  });

  return Response.json({ suggestion }, { status: 201 });
}
