import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { deleteAllHouseholdData } from "@/lib/utils/deleteHouseholdData";

// POST: admin only — wipe all household content but keep the household and its
// members. Backs the Danger Zone "Delete all data" flow in settings.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  await deleteAllHouseholdData(id);

  return Response.json({ success: true });
}
