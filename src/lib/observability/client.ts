"use client";

import type { ObservabilityEvent } from "@/lib/observability/shared";
import { normalizePath, sanitizeMessage } from "@/lib/observability/shared";

const INGEST_ENDPOINT = "/api/observability/events";

function isEnabled(): boolean {
  const configured = process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED;
  if (configured === undefined) return process.env.NODE_ENV === "production";
  return configured === "true";
}

function dispatchEvent(event: Omit<ObservabilityEvent, "timestamp">): void {
  if (!isEnabled()) return;

  const payload: ObservabilityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(INGEST_ENDPOINT, blob);
      return;
    }

    void fetch(INGEST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Never let observability break the user flow.
  }
}

export function trackPageView(pathname: string, search = ""): void {
  dispatchEvent({
    type: "page_view",
    pathname: normalizePath(`${pathname}${search}`),
  });
}

export function trackNavigationStart(url: string, navigationType: string): void {
  dispatchEvent({
    type: "navigation_start",
    url: normalizePath(url),
    navigationType,
  });
}

export function trackWebVital(metric: {
  name: string;
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
  id?: string;
}): void {
  dispatchEvent({
    type: "web_vital",
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    digest: metric.id,
  });
}

export function reportClientError(args: {
  source: string;
  error?: Error | null;
  message?: string;
  digest?: string;
  pathname?: string;
}): void {
  dispatchEvent({
    type: "client_error",
    source: args.source,
    pathname: normalizePath(args.pathname),
    digest: args.digest,
    name: args.error?.name,
    message: sanitizeMessage(args.message ?? args.error?.message),
  });
}
