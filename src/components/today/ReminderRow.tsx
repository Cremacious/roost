'use client'

import { Bell } from 'lucide-react'

interface ReminderRowProps {
  id: string
  title: string
  frequency?: string | null
  ownedByUser?: boolean
  completed?: boolean
  isLast?: boolean
  onComplete: (id: string) => void
}

function freqLabel(f?: string | null): string {
  if (!f || f === 'once') return 'One-time'
  const map: Record<string, string> = {
    daily: 'Repeats daily',
    weekly: 'Repeats weekly',
    monthly: 'Repeats monthly',
    custom: 'Repeats on schedule',
  }
  return map[f] ?? 'Recurring'
}

export function ReminderRow({ id, title, frequency, ownedByUser, completed = false, isLast = false, onComplete }: ReminderRowProps) {
  if (completed) return null

  const label = freqLabel(frequency)
  const meta = ownedByUser === false ? `${label} · From a housemate` : label

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
          border: '2px solid #A5F3FC',
          background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, padding: 0,
        }}
        aria-label="Complete reminder"
      />

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bell size={12} color="#06B6D4" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--roost-text-muted)', marginLeft: 18 }}>
          {meta}
        </div>
      </div>

      {/* Status badge */}
      <span style={{
        fontSize: 10, fontWeight: 800,
        padding: '2px 7px', borderRadius: 6, flexShrink: 0,
        background: '#CFFAFE',
        color: '#0891B2',
      }}>
        Due
      </span>

      {/* Done button */}
      <button
        onClick={() => onComplete(id)}
        style={{
          padding: '5px 11px', borderRadius: 8,
          background: '#CFFAFE',
          border: '1.5px solid #06B6D4',
          borderBottom: '2px solid #0891B2',
          fontFamily: 'inherit', fontSize: 10, fontWeight: 900,
          color: '#0891B2', cursor: 'pointer', flexShrink: 0,
        }}
      >
        Done
      </button>
    </div>
  )
}
