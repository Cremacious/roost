'use client'

import { differenceInCalendarDays } from 'date-fns'

interface ChoreRowProps {
  id: string
  title: string
  overdue: boolean
  frequency?: string | null
  nextDueAt?: string | null
  completed?: boolean
  isLast?: boolean
  onComplete: (id: string) => void
}

function formatFreq(f?: string | null): string {
  if (!f) return ''
  const map: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly',
    monthly: 'Monthly', yearly: 'Yearly', custom: 'Custom',
  }
  return map[f] ?? f
}

export function ChoreRow({ id, title, overdue, frequency, nextDueAt, completed = false, isLast = false, onComplete }: ChoreRowProps) {
  if (completed) return null

  let daysLate = 0
  if (overdue && nextDueAt) {
    daysLate = Math.max(1, differenceInCalendarDays(new Date(), new Date(nextDueAt)))
  }

  const freq = formatFreq(frequency)
  const meta = freq
    ? overdue
      ? `${freq} · ${daysLate} ${daysLate === 1 ? 'day' : 'days'} overdue`
      : `${freq} · due today`
    : overdue
      ? `${daysLate} ${daysLate === 1 ? 'day' : 'days'} overdue`
      : 'due today'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 0',
      borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
    }}>
      {/* Circle check */}
      <button
        onClick={() => onComplete(id)}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '2px solid #D1D5DB',
          background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, padding: 0,
        }}
        aria-label="Complete chore"
      />

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
          {meta}
        </div>
      </div>

      {/* Status badge */}
      <span style={{
        fontSize: 10, fontWeight: 800,
        padding: '2px 7px', borderRadius: 6, flexShrink: 0,
        background: overdue ? '#FEE2E2' : '#FEF3C7',
        color: overdue ? '#B91C1C' : '#92400E',
      }}>
        {overdue ? `${daysLate} ${daysLate === 1 ? 'day' : 'days'}` : 'Today'}
      </span>

      {/* Done button */}
      <button
        onClick={() => onComplete(id)}
        style={{
          padding: '5px 11px', borderRadius: 8,
          background: '#DCFCE7',
          border: '1.5px solid #22C55E',
          borderBottom: '2px solid #15803D',
          fontFamily: 'inherit', fontSize: 10, fontWeight: 900,
          color: '#15803D', cursor: 'pointer', flexShrink: 0,
        }}
      >
        Done
      </button>
    </div>
  )
}
