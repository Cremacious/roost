// Minimal structured logger for Vercel function logs.
//
// Output format: [event] key=value key=value
//
// This format is:
//   - Human-readable in raw Vercel log output
//   - Filterable in Vercel's log explorer (search for "[cron/" or "event=stripe.webhook.received")
//   - Trivially replaceable: swap console.* calls with a real provider (Sentry, Axiom, etc.)
//     post-launch by updating only this file.
//
// Rules:
//   - Never log PII (user emails, names, receipt content, card data).
//   - IDs (userId, householdId) are fine — they are internal references, not personal data.
//   - Amounts and counts are fine.
//   - Errors are logged with their message only (not full stack) to keep logs readable.

type LogData = Record<string, string | number | boolean | null | undefined>;

function formatLine(event: string, data?: LogData): string {
  const parts = [`[${event}]`];
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) parts.push(`${k}=${v}`);
    }
  }
  return parts.join(" ");
}

export const log = {
  info(event: string, data?: LogData): void {
    console.info(formatLine(event, data));
  },

  warn(event: string, data?: LogData): void {
    console.warn(formatLine(event, data));
  },

  error(event: string, data?: LogData, err?: unknown): void {
    const line = formatLine(event, data);
    if (err instanceof Error) {
      console.error(line, err.message);
    } else if (err !== undefined) {
      console.error(line, String(err));
    } else {
      console.error(line);
    }
  },
};
