import { addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, format } from 'date-fns'

export interface ParsedTask {
  title: string
  dueDate: string | null  // ISO date YYYY-MM-DD
  dueTime: string | null  // HH:MM 24h
  priority: 'high' | 'medium' | 'low' | null
}

const PRIORITY_PATTERNS: Array<{ re: RegExp; value: 'high' | 'medium' | 'low' }> = [
  { re: /\bhigh\b/i, value: 'high' },
  { re: /\bmed(?:ium)?\b/i, value: 'medium' },
  { re: /\blow\b/i, value: 'low' },
]

const WEEKDAY_FNS: Record<string, (date: Date) => Date> = {
  mon: nextMonday,
  monday: nextMonday,
  tue: nextTuesday,
  tuesday: nextTuesday,
  wed: nextWednesday,
  wednesday: nextWednesday,
  thu: nextThursday,
  thursday: nextThursday,
  fri: nextFriday,
  friday: nextFriday,
  sat: nextSaturday,
  saturday: nextSaturday,
  sun: nextSunday,
  sunday: nextSunday,
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function parse12hTime(hour: string, minute: string | null, ampm: string): string {
  let h = parseInt(hour, 10)
  const m = minute ? parseInt(minute.replace(':', ''), 10) : 0
  if (ampm.toLowerCase() === 'pm' && h !== 12) h += 12
  if (ampm.toLowerCase() === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseTaskInput(raw: string): ParsedTask {
  let s = raw.trim()
  let priority: 'high' | 'medium' | 'low' | null = null
  let dueDate: string | null = null
  let dueTime: string | null = null

  // 1. Priority
  for (const { re, value } of PRIORITY_PATTERNS) {
    if (re.test(s)) {
      priority = value
      s = s.replace(re, '').trim()
      break
    }
  }

  // 2. Time — 12h format: "3pm", "3:30pm", "3:30 pm"
  const time12 = s.match(/\b(\d{1,2})(:\d{2})?\s*(am|pm)\b/i)
  if (time12) {
    dueTime = parse12hTime(time12[1], time12[2] ?? null, time12[3])
    s = s.replace(time12[0], '').trim()
  } else {
    // 24h: "14:30"
    const time24 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
    if (time24) {
      dueTime = `${time24[1].padStart(2, '0')}:${time24[2]}`
      s = s.replace(time24[0], '').trim()
    }
  }

  // 3. Date — named relative
  const today = new Date()
  if (/\btoday\b/i.test(s)) {
    dueDate = toISODate(today)
    s = s.replace(/\btoday\b/i, '').trim()
  } else if (/\btomorrow\b/i.test(s)) {
    dueDate = toISODate(addDays(today, 1))
    s = s.replace(/\btomorrow\b/i, '').trim()
  } else {
    // Weekday names
    const weekdayMatch = s.match(
      /\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i
    )
    if (weekdayMatch) {
      const fn = WEEKDAY_FNS[weekdayMatch[1].toLowerCase()]
      if (fn) {
        dueDate = toISODate(fn(today))
        s = s.replace(weekdayMatch[0], '').trim()
      }
    } else {
      // "jan 5", "january 15"
      const monthDay = s.match(
        /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i
      )
      if (monthDay) {
        const month = MONTH_MAP[monthDay[1].toLowerCase()]
        const day = parseInt(monthDay[2], 10)
        const d = new Date(today.getFullYear(), month, day)
        if (d < today) d.setFullYear(today.getFullYear() + 1)
        dueDate = toISODate(d)
        s = s.replace(monthDay[0], '').trim()
      } else {
        // "12/25" or "12/25/2026"
        const slashDate = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/)
        if (slashDate) {
          const month = parseInt(slashDate[1], 10) - 1
          const day = parseInt(slashDate[2], 10)
          const year = slashDate[3] ? parseInt(slashDate[3], 10) : today.getFullYear()
          const d = new Date(year, month, day)
          if (!slashDate[3] && d < today) d.setFullYear(today.getFullYear() + 1)
          dueDate = toISODate(d)
          s = s.replace(slashDate[0], '').trim()
        }
      }
    }
  }

  // Clean up leftover punctuation/whitespace
  const title = s.replace(/\s{2,}/g, ' ').trim() || raw.trim()

  return { title, dueDate, dueTime, priority }
}
