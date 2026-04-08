import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { parseReceiptImage } from "@/lib/utils/azureReceipts";

// Max base64 length for a 10MB image (10 * 1024 * 1024 / 0.75 ≈ 13,981,013)
const MAX_BASE64_LENGTH = 14_000_000;

export async function POST(request: NextRequest): Promise<Response> {
  console.log("[scan] route hit:", {
    hasEndpoint: !!process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    nodeEnv: process.env.NODE_ENV,
  });

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

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  if (!household || household.subscription_status !== "premium") {
    return Response.json(
      { error: "Premium required", code: "RECEIPT_SCAN_PREMIUM" },
      { status: 403 }
    );
  }

  let body: { imageBase64?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.imageBase64) {
    return Response.json({ error: "Image is required" }, { status: 400 });
  }

  if (body.imageBase64.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: "Image must be under 10MB" }, { status: 400 });
  }

  try {
    const receipt = await parseReceiptImage(body.imageBase64);
    return Response.json({
      receipt,
      warning:
        receipt.lineItems.length === 0
          ? "No items detected. You can add them manually."
          : undefined,
    });
  } catch (err) {
    console.error("[POST /api/expenses/scan] Vision API error:", err);
    return Response.json(
      { error: "Could not read receipt", code: "SCAN_FAILED" },
      { status: 422 }
    );
  }
}
