import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meal_suggestion_votes, meal_suggestions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST -------------------------------------------------------------------

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
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  const { householdId } = membership;

  // Verify suggestion belongs to household
  const [suggestion] = await db
    .select()
    .from(meal_suggestions)
    .where(and(eq(meal_suggestions.id, id), eq(meal_suggestions.household_id, householdId)))
    .limit(1);

  if (!suggestion) {
    return Response.json({ error: "Suggestion not found" }, { status: 404 });
  }

  let body: { vote?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.vote !== "up" && body.vote !== "down") {
    return Response.json({ error: "vote must be 'up' or 'down'" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(meal_suggestion_votes)
    .where(
      and(
        eq(meal_suggestion_votes.suggestion_id, id),
        eq(meal_suggestion_votes.user_id, session.user.id)
      )
    )
    .limit(1);

  if (existing && existing.vote === body.vote) {
    // Same vote: toggle off
    await db.delete(meal_suggestion_votes).where(eq(meal_suggestion_votes.id, existing.id));
  } else if (existing) {
    // Different vote: update
    await db
      .update(meal_suggestion_votes)
      .set({ vote: body.vote })
      .where(eq(meal_suggestion_votes.id, existing.id));
  } else {
    // No vote: insert
    await db.insert(meal_suggestion_votes).values({
      suggestion_id: id,
      user_id: session.user.id,
      vote: body.vote,
    });
  }

  // Return updated counts
  const allVotes = await db
    .select()
    .from(meal_suggestion_votes)
    .where(eq(meal_suggestion_votes.suggestion_id, id));

  const upvotes = allVotes.filter((v) => v.vote === "up").length;
  const downvotes = allVotes.filter((v) => v.vote === "down").length;
  const userVote = allVotes.find((v) => v.user_id === session.user.id)?.vote ?? null;

  return Response.json({ upvotes, downvotes, userVote });
}
