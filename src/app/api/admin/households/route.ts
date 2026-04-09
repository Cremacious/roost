import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const search = searchParams.get("search")?.trim() ?? "";
  const filter = searchParams.get("filter") ?? "all";
  const offset = (page - 1) * limit;

  const searchClause = search
    ? sql`AND h.name ILIKE ${"%" + search + "%"}`
    : sql``;

  const filterClause =
    filter === "premium"
      ? sql`AND h.subscription_status = 'premium'`
      : filter === "free"
      ? sql`AND h.subscription_status = 'free'`
      : sql``;

  const [householdsRows, countRows] = await Promise.all([
    db.execute(sql`
      SELECT
        h.id,
        h.name,
        h.code,
        h.subscription_status,
        h.stripe_customer_id,
        h.stripe_subscription_id,
        h.created_at,
        h.subscription_upgraded_at,
        h.premium_expires_at,
        COUNT(hm.id) AS member_count,
        COALESCE(
          ARRAY_AGG(u.email ORDER BY hm.created_at ASC) FILTER (WHERE u.email IS NOT NULL),
          '{}'
        ) AS member_emails
      FROM households h
      LEFT JOIN household_members hm ON hm.household_id = h.id
      LEFT JOIN "user" u ON u.id = hm.user_id
      WHERE h.deleted_at IS NULL
      ${searchClause}
      ${filterClause}
      GROUP BY h.id
      ORDER BY h.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*) AS total
      FROM households h
      WHERE h.deleted_at IS NULL
      ${searchClause}
      ${filterClause}
    `),
  ]);

  const total = Number((countRows.rows[0] as Record<string, string>)?.total ?? 0);

  type HouseholdRow = {
    id: string;
    name: string;
    code: string;
    subscription_status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    created_at: string;
    subscription_upgraded_at: string | null;
    premium_expires_at: string | null;
    member_count: string;
    member_emails: string[];
  };

  const households = (householdsRows.rows as HouseholdRow[]).map((h) => ({
    id: h.id,
    name: h.name,
    code: h.code,
    subscriptionStatus: h.subscription_status,
    stripeCustomerId: h.stripe_customer_id,
    stripeSubscriptionId: h.stripe_subscription_id,
    createdAt: h.created_at,
    subscriptionUpgradedAt: h.subscription_upgraded_at,
    premiumExpiresAt: h.premium_expires_at,
    memberCount: Number(h.member_count),
    memberEmails: h.member_emails ?? [],
  }));

  return Response.json({
    households,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
