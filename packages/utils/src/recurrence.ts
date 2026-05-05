import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns'

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'yearly'

export interface RecurringEvent {
  id: string
  start_time: Date
  end_time: Date
  frequency: RecurrenceFrequency
  repeat_end_type: 'forever' | 'until_date' | 'after_occurrences'
  repeat_until?: Date | null
  repeat_occurrences?: number | null
  [key: string]: unknown
}

export function expandRecurringEvent(
  template: RecurringEvent,
  rangeStart: Date,
  rangeEnd: Date,
): (RecurringEvent & { isRecurring: true; template_start_time: Date })[] {
  const results: (RecurringEvent & {
    isRecurring: true
    template_start_time: Date
  })[] = []

  const duration =
    template.end_time.getTime() - template.start_time.getTime()
  let current = startOfDay(template.start_time)
  let count = 0
  const maxIterations = 500

  while (count < maxIterations) {
    const end = new Date(current.getTime() + duration)

    if (isAfter(current, rangeEnd)) break
    if (
      template.repeat_end_type === 'until_date' &&
      template.repeat_until &&
      isAfter(current, template.repeat_until)
    )
      break
    if (
      template.repeat_end_type === 'after_occurrences' &&
      template.repeat_occurrences != null &&
      results.length >= template.repeat_occurrences
    )
      break

    if (!isBefore(end, rangeStart)) {
      results.push({
        ...template,
        start_time: new Date(current),
        end_time: end,
        isRecurring: true as const,
        template_start_time: template.start_time,
      })
    }

    switch (template.frequency) {
      case 'daily':
        current = addDays(current, 1)
        break
      case 'weekly':
        current = addWeeks(current, 1)
        break
      case 'biweekly':
        current = addWeeks(current, 2)
        break
      case 'monthly':
        current = addMonths(current, 1)
        break
      case 'yearly':
        current = addYears(current, 1)
        break
    }
    count++
  }

  return results
}
