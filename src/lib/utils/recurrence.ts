// Shared recurrence expansion. Extracted from the calendar route so the Today
// route and the calendar route share one implementation of the recurrence math.
//
// The function is generic over the event shape: it only reads the recurrence
// fields below, and returns every field of the input event plus the two derived
// fields (isRecurring, templateStartTime). This keeps the calendar route's
// output identical to its previous inline behavior.

export interface RecurrenceFields {
  startTime: Date
  endTime: Date
  frequency: string | null
  repeatEndType: string | null
  repeatUntil: Date | null
  repeatOccurrences: number | null
}

export function expandRecurring<T extends RecurrenceFields>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date,
): Array<T & { isRecurring: boolean; templateStartTime: string }> {
  const results: Array<T & { isRecurring: boolean; templateStartTime: string }> = []
  if (!event.frequency) return results

  const templateStartTime = event.startTime.toISOString()
  const durationMs = event.endTime.getTime() - event.startTime.getTime()
  let current = new Date(event.startTime)
  let count = 0
  const MAX = 60

  while (count < MAX) {
    // Check end conditions
    if (event.repeatEndType === 'until_date' && event.repeatUntil && current > event.repeatUntil) break
    if (event.repeatEndType === 'after_occurrences' && event.repeatOccurrences && count >= event.repeatOccurrences) break

    if (current >= rangeStart && current < rangeEnd) {
      results.push({
        ...event,
        startTime: new Date(current),
        endTime: new Date(current.getTime() + durationMs),
        isRecurring: true,
        templateStartTime,
      })
    }

    // Advance
    const next = new Date(current)
    switch (event.frequency) {
      case 'daily':    next.setDate(next.getDate() + 1); break
      case 'weekly':   next.setDate(next.getDate() + 7); break
      case 'biweekly': next.setDate(next.getDate() + 14); break
      case 'monthly':  next.setMonth(next.getMonth() + 1); break
      case 'yearly':   next.setFullYear(next.getFullYear() + 1); break
      default:         next.setDate(next.getDate() + 7)
    }

    if (next <= current) break // safety
    current = next
    count++

    // Stop expanding if well past range
    if (current > rangeEnd && results.length > 0) break
  }

  return results
}
