import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isAfter,
  isBefore,
} from "date-fns";

// ---- Types ------------------------------------------------------------------

export type RecurringFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
export type RepeatEndType = "forever" | "until_date" | "after_occurrences";

export interface CalendarEventTemplate {
  id: string;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date | null;
  all_day: boolean;
  created_by: string;
  created_at: Date | null;
  creator_name: string | null;
  creator_avatar: string | null;
  recurring: boolean;
  frequency: string | null;
  repeat_end_type: string | null;
  repeat_until: Date | null;
  repeat_occurrences: number | null;
  attendees: { userId: string; name: string | null; avatarColor: string | null }[];
}

export interface CalendarEventInstance extends CalendarEventTemplate {
  // start_time is replaced with the instance occurrence date (same time-of-day as template)
  // end_time is replaced maintaining the same duration as the template
  isRecurring: boolean;
  // The original template start_time — used by EventSheet edit mode so editing
  // always targets the template anchor date, not the specific instance date
  template_start_time: string | null;
}

// ---- Helpers ----------------------------------------------------------------

function applyTimeToDate(instanceDay: Date, templateTime: Date): Date {
  const result = new Date(instanceDay);
  result.setHours(
    templateTime.getHours(),
    templateTime.getMinutes(),
    templateTime.getSeconds(),
    0
  );
  return result;
}

function advanceByFrequency(date: Date, frequency: string): Date {
  switch (frequency) {
    case "daily":     return addDays(date, 1);
    case "weekly":    return addWeeks(date, 1);
    case "biweekly":  return addWeeks(date, 2);
    case "monthly":   return addMonths(date, 1);
    case "yearly":    return addYears(date, 1);
    default:          return addWeeks(date, 1);
  }
}

// ---- Core expansion ---------------------------------------------------------

export function expandRecurringEvent(
  event: CalendarEventTemplate,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEventInstance[] {
  // Non-recurring: return a single instance without modification
  if (!event.recurring || !event.frequency) {
    return [
      {
        ...event,
        isRecurring: false,
        template_start_time: null,
      },
    ];
  }

  const instances: CalendarEventInstance[] = [];
  const templateStart = new Date(event.start_time);
  const durationMs = event.end_time
    ? event.end_time.getTime() - event.start_time.getTime()
    : null;

  // Hard stop date
  let hardStop: Date | null = null;
  if (event.repeat_end_type === "until_date" && event.repeat_until) {
    hardStop = new Date(event.repeat_until);
  }

  // Max occurrences (500 cap for 'forever')
  const maxOccurrences = event.repeat_occurrences ?? 500;

  let current = new Date(templateStart);
  let occurrenceCount = 0;

  while (true) {
    // Stop: total occurrence limit reached
    if (occurrenceCount >= maxOccurrences) break;

    // Stop: hard stop date passed
    if (hardStop && isAfter(current, hardStop)) break;

    // Stop: past the query range (no need to go further)
    if (isAfter(current, rangeEnd)) break;

    // Only include if within query range
    if (!isBefore(current, rangeStart)) {
      const instanceStart = applyTimeToDate(current, templateStart);
      const instanceEnd =
        durationMs !== null
          ? new Date(instanceStart.getTime() + durationMs)
          : null;

      instances.push({
        ...event,
        start_time: instanceStart,
        end_time: instanceEnd,
        isRecurring: true,
        template_start_time: event.start_time.toISOString(),
      });
    }

    occurrenceCount++;
    current = advanceByFrequency(current, event.frequency);
  }

  return instances;
}

// ---- Batch expand -----------------------------------------------------------

export function expandEventsForRange(
  events: CalendarEventTemplate[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEventInstance[] {
  return events.flatMap((event) =>
    expandRecurringEvent(event, rangeStart, rangeEnd)
  );
}
