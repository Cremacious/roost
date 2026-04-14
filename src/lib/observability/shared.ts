export const OBSERVABILITY_EVENT_TYPES = [
  "page_view",
  "navigation_start",
  "web_vital",
  "client_error",
  "server_error",
] as const;

export type ObservabilityEventType = (typeof OBSERVABILITY_EVENT_TYPES)[number];

export interface ObservabilityEvent {
  type: ObservabilityEventType;
  pathname?: string;
  url?: string;
  source?: string;
  name?: string;
  value?: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
  digest?: string;
  message?: string;
  timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown, maxLength = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Number(value.toFixed(4));
}

export function sanitizeMessage(message: string | undefined): string | undefined {
  const normalized = normalizeString(message, 240);
  if (!normalized) return undefined;

  return normalized
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/https?:\/\/[^\s]+/gi, "[redacted-url]")
    .replace(/\b(sk|pk|whsec|re)_[A-Za-z0-9_]+\b/g, "[redacted-secret]")
    .replace(/\b\d{6,}\b/g, "[redacted-number]");
}

export function normalizePath(value: string | undefined): string | undefined {
  const normalized = normalizeString(value, 300);
  if (!normalized) return undefined;

  try {
    const parsed = normalized.startsWith("http")
      ? new URL(normalized)
      : new URL(normalized, "http://localhost");
    const path = `${parsed.pathname}${parsed.search}`;
    return path.slice(0, 300);
  } catch {
    return normalized.slice(0, 300);
  }
}

export function parseObservabilityEvent(input: unknown): ObservabilityEvent | null {
  if (!isRecord(input)) return null;

  const type = normalizeString(input.type, 40);
  if (!type || !OBSERVABILITY_EVENT_TYPES.includes(type as ObservabilityEventType)) {
    return null;
  }

  return {
    type: type as ObservabilityEventType,
    pathname: normalizePath(normalizeString(input.pathname, 300)),
    url: normalizePath(normalizeString(input.url, 300)),
    source: normalizeString(input.source, 80),
    name: normalizeString(input.name, 80),
    value: normalizeNumber(input.value),
    rating:
      input.rating === "good" ||
      input.rating === "needs-improvement" ||
      input.rating === "poor"
        ? input.rating
        : undefined,
    navigationType: normalizeString(input.navigationType, 40),
    digest: normalizeString(input.digest, 120),
    message: sanitizeMessage(normalizeString(input.message, 240)),
    timestamp:
      normalizeString(input.timestamp, 80) ?? new Date().toISOString(),
  };
}
