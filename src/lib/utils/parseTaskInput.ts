import { addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, format } from 'date-fns'

export interface ParsedTask {
  title: string
  dueDate: string | null  // ISO date YYYY-MM-DD
  dueTime: string | null  // HH:MM 24h
  priority: 'high' | 'medium' | 'low' | null
  assignee: string | null // lower-cased first name from an "@name" token, if present
}

function normalizePriority(word: string): 'high' | 'medium' | 'low' {
  const w = word.toLowerCase()
  if (w === 'high') return 'high'
  if (w === 'low') return 'low'
  return 'medium' // med, medium
}

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
  let assignee: string | null = null

  // 0. Assignee — "@name" anywhere.
  const assigneeMatch = s.match(/(?:^|\s)@(\w+)/)
  if (assigneeMatch) {
    assignee = assigneeMatch[1].toLowerCase()
    s = s.replace(assigneeMatch[0], ' ').trim()
  }

  // 1. Priority — explicit "!high/!medium/!med/!low" anywhere, otherwise a bare
  //    priority word ONLY when it is the last token (avoids "high chair",
  //    "low-fat milk" false positives from matching mid-title words).
  const explicitPriority = s.match(/(?:^|\s)!(high|medium|med|low)\b/i)
  if (explicitPriority) {
    priority = normalizePriority(explicitPriority[1])
    s = s.replace(explicitPriority[0], ' ').trim()
  } else {
    const trailingPriority = s.match(/(?:^|\s)(high|medium|med|low)\s*$/i)
    if (trailingPriority) {
      priority = normalizePriority(trailingPriority[1])
      s = s.slice(0, s.length - trailingPriority[0].length).trim()
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
        // Reject impossible dates (e.g. "feb 30" would silently roll to Mar 2).
        if (d.getMonth() === month && d.getDate() === day) {
          if (d < today) d.setFullYear(today.getFullYear() + 1)
          dueDate = toISODate(d)
          s = s.replace(monthDay[0], '').trim()
        }
      } else {
        // "12/25" or "12/25/2026"
        const slashDate = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/)
        if (slashDate) {
          const month = parseInt(slashDate[1], 10) - 1
          const day = parseInt(slashDate[2], 10)
          const year = slashDate[3] ? parseInt(slashDate[3], 10) : today.getFullYear()
          const d = new Date(year, month, day)
          // Reject impossible dates (e.g. "2/30" would silently roll to Mar 2).
          if (d.getMonth() === month && d.getDate() === day) {
            if (!slashDate[3] && d < today) d.setFullYear(today.getFullYear() + 1)
            dueDate = toISODate(d)
            s = s.replace(slashDate[0], '').trim()
          }
        }
      }
    }
  }

  // Clean up leftover punctuation/whitespace
  const title = s.replace(/\s{2,}/g, ' ').trim() || raw.trim()

  return { title, dueDate, dueTime, priority, assignee }
}
