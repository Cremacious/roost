import { NextRequest } from "next/server";
import { POST as approveSuggestion } from "@/app/api/meals/suggestions/[id]/approve/route";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  return approveSuggestion(request, context);
}
