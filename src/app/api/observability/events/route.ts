import { parseObservabilityEvent } from "@/lib/observability/shared";
import {
  ingestObservabilityEvent,
  isAllowedObservabilityOrigin,
} from "@/lib/observability/server";

async function parseRequestBody(request: Request): Promise<unknown> {
  const rawBody = await request.text();
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedObservabilityOrigin(request.headers.get("origin"))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = parseObservabilityEvent(await parseRequestBody(request));
  if (!payload) {
    return Response.json({ error: "Invalid event payload" }, { status: 400 });
  }

  await ingestObservabilityEvent(payload, {
    userAgent: request.headers.get("user-agent"),
    origin: request.headers.get("origin"),
  });

  return Response.json(
    { ok: true },
    {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
