import { getAppUrl, getObservabilityWebhookUrl } from "@/lib/env";
import type { ObservabilityEvent } from "@/lib/observability/shared";
import { normalizePath, sanitizeMessage } from "@/lib/observability/shared";
import { log } from "@/lib/utils/logger";

type EventRequestMetadata = {
  userAgent?: string | null;
  origin?: string | null;
};

async function forwardToWebhook(payload: Record<string, unknown>): Promise<void> {
  const webhookUrl = getObservabilityWebhookUrl();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    log.warn("obs.webhook.failed", {
      eventType: String(payload.type ?? "unknown"),
    });
    log.error("obs.webhook.error", undefined, error);
  }
}

export async function ingestObservabilityEvent(
  event: ObservabilityEvent,
  requestMetadata?: EventRequestMetadata
): Promise<void> {
  const logData = {
    type: event.type,
    source: event.source,
    pathname: event.pathname ?? event.url,
    name: event.name,
    rating: event.rating,
    navigationType: event.navigationType,
    digest: event.digest,
  };

  if (event.type === "client_error" || event.type === "server_error") {
    log.error("obs.event", logData, event.message);
  } else {
    log.info("obs.event", {
      ...logData,
      value: event.value,
    });
  }

  await forwardToWebhook({
    ...event,
    appUrl: getAppUrl(),
    userAgent: requestMetadata?.userAgent ?? undefined,
    origin: requestMetadata?.origin ?? undefined,
  });
}

export function isAllowedObservabilityOrigin(origin: string | null): boolean {
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(getAppUrl()).origin;
  } catch {
    return false;
  }
}

export async function reportRequestError(args: {
  error: Error & { digest?: string };
  path: string;
  method: string;
  routePath?: string;
  routeType?: string;
  routerKind?: string;
}): Promise<void> {
  await ingestObservabilityEvent({
    type: "server_error",
    pathname: normalizePath(args.path),
    source: args.routeType ?? "render",
    name: args.error.name,
    digest: args.error.digest,
    message: sanitizeMessage(args.error.message),
    timestamp: new Date().toISOString(),
  });

  log.error("obs.request_error", {
    path: normalizePath(args.path),
    method: args.method,
    routePath: args.routePath,
    routeType: args.routeType,
    routerKind: args.routerKind,
    digest: args.error.digest,
  });
}
