'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'

interface ChoreItem { id: string; title: string; nextDueAt: string | null; frequency?: string; overdue: boolean }
interface ReminderItem { id: string; title: string; nextRemindAt: string; ownedByUser?: boolean }

interface HeroCardProps {
  type: 'overdue_chore' | 'due_chore' | 'reminder' | 'all_clear'
  item: ChoreItem | ReminderItem | null
  onCompleteChore?: (id: string) => void
  onReminderDone?: (id: string) => void
  onReminderSnooze?: (id: string) => void
  /** Disables the primary action while a mutation for this hero is in flight,
   *  preventing a rapid double-submit before the refetch advances the hero. */
  actionDisabled?: boolean
  /** Number of OTHER items still needing attention beyond this hero item.
   *  When > 0 the hero shows a subtle "+N more need attention" line. */
  moreCount?: number
}

function formatFreq(f?: string | null): string {
  if (!f) return ''
  const map: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly',
    monthly: 'Monthly', yearly: 'Yearly', custom: 'Custom',
  }
  return map[f] ?? f
}

const BG: Record<string, string> = {
  overdue_chore: '#EF4444',
  due_chore:     '#F59E0B',
  reminder:      '#3B82F6',
  all_clear:     '#22C55E',
}

export function HeroCard({ type, item, onCompleteChore, onReminderDone, onReminderSnooze, actionDisabled = false, moreCount = 0 }: HeroCardProps) {
  const choreItem  = (type === 'overdue_chore' || type === 'due_chore') ? item as ChoreItem | null : null
  const reminderItem = type === 'reminder' ? item as ReminderItem | null : null
  const bg = BG[type]

  // Days overdue
  let daysLate = 0
  if (choreItem?.nextDueAt && choreItem.overdue) {
    daysLate = Math.max(1, differenceInCalendarDays(new Date(), new Date(choreItem.nextDueAt)))
  }

  // Per-state content
  let eyebrow = ''
  let title   = ''
  let meta    = ''

  if (type === 'overdue_chore' && choreItem) {
    const freq = formatFreq(choreItem.frequency)
    eyebrow = 'Needs your attention'
    title   = `${choreItem.title} is ${daysLate} ${daysLate === 1 ? 'day' : 'days'} overdue`
    meta    = freq ? `${freq} chore · Your turn` : 'Your turn'
  } else if (type === 'due_chore' && choreItem) {
    const freq = formatFreq(choreItem.frequency)
    eyebrow = 'Up next for you'
    title   = `${choreItem.title} is due today`
    meta    = freq ? `${freq} chore · Your turn` : 'Your turn'
  } else if (type === 'reminder' && reminderItem) {
    eyebrow = 'Reminder'
    title   = reminderItem.title
    meta    = reminderItem.ownedByUser === false ? 'Due today' : 'Set by you · Due today'
  } else if (type === 'all_clear') {
    eyebrow = "You're all caught up"
    title   = 'Nothing on your plate today'
    meta    = 'All chores done · No reminders'
  }

  return (
    <div style={{ background: bg, borderRadius: 18, padding: '20px 18px 18px', position: 'relative', overflow: 'hidden' }}>

      {/* All-clear check circle */}
      {type === 'all_clear' && (
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative', zIndex: 1 }}>
          <Check size={26} color="white" strokeWidth={2.5} />
        </div>
      )}

      {/* Eyebrow */}
      <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px', position: 'relative', zIndex: 1 }}>
        {eyebrow}
      </p>

      {/* Title */}
      <p style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.3px', lineHeight: 1.2, margin: '0 0 6px', position: 'relative', zIndex: 1 }}>
        {title}
      </p>

      {/* Meta */}
      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 14px', position: 'relative', zIndex: 1 }}>
        {meta}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
        {(type === 'overdue_chore' || type === 'due_chore') && choreItem && onCompleteChore && (
          <button
            onClick={() => { if (!actionDisabled) onCompleteChore(choreItem.id) }}
            disabled={actionDisabled}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', borderRadius: 11,
              background: 'white', border: 'none',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 900,
              color: type === 'overdue_chore' ? '#B91C1C' : '#92400E',
              cursor: actionDisabled ? 'default' : 'pointer',
              opacity: actionDisabled ? 0.6 : 1,
            }}
          >
            <Check size={14} strokeWidth={2.5} />
            Mark complete
          </button>
        )}

        {type === 'reminder' && reminderItem && (
          <>
            <button
              onClick={() => { if (!actionDisabled) onReminderDone?.(reminderItem.id) }}
              disabled={actionDisabled}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 11, background: 'white', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 900, color: '#1D4ED8', cursor: actionDisabled ? 'default' : 'pointer', opacity: actionDisabled ? 0.6 : 1 }}
            >
              <Check size={14} strokeWidth={2.5} />
              Done
            </button>
            <button
              onClick={() => { if (!actionDisabled) onReminderSnooze?.(reminderItem.id) }}
              disabled={actionDisabled}
              style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 11, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', fontFamily: 'inherit', fontSize: 13, fontWeight: 900, color: 'white', cursor: actionDisabled ? 'default' : 'pointer', opacity: actionDisabled ? 0.6 : 1 }}
            >
              Snooze
            </button>
          </>
        )}

        {type === 'all_clear' && (
          <Link
            href="/household"
            style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 11, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', fontFamily: 'inherit', fontSize: 13, fontWeight: 900, color: 'white', textDecoration: 'none' }}
          >
            View household
          </Link>
        )}
      </div>

      {/* More-to-do count: only when other items still need attention */}
      {type !== 'all_clear' && moreCount > 0 && (
        <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.85)', margin: '13px 0 0', position: 'relative', zIndex: 1 }}>
          +{moreCount} more need attention
        </p>
      )}
    </div>
  )
}
