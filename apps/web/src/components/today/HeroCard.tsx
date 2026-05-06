'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Clock, Bell } from 'lucide-react'

interface ChoreItem { id: string; title: string; nextDueAt: string | null; overdue: boolean }
interface ReminderItem { id: string; title: string; nextRemindAt: string }

interface HeroCardProps {
  type: 'overdue_chore' | 'due_chore' | 'reminder' | 'all_clear'
  item: ChoreItem | ReminderItem | null
  onCompleteChore?: (id: string) => void
}

const CONFIGS = {
  overdue_chore: { bg: '#FEF2F2', border: '#FCA5A5', slab: '#EF4444', icon: AlertCircle, iconColor: '#EF4444', label: 'Overdue' },
  due_chore:     { bg: '#FFF7ED', border: '#FED7AA', slab: '#F97316', icon: Clock,         iconColor: '#F97316', label: 'Due today' },
  reminder:      { bg: '#ECFEFF', border: '#A5F3FC', slab: '#06B6D4', icon: Bell,          iconColor: '#06B6D4', label: 'Reminder' },
  all_clear:     { bg: '#F0FDF4', border: '#BBF7D0', slab: '#22C55E', icon: CheckCircle2,  iconColor: '#22C55E', label: '' },
}

export function HeroCard({ type, item, onCompleteChore }: HeroCardProps) {
  const cfg = CONFIGS[type]
  const IconComponent = cfg.icon
  const choreItem = (type === 'overdue_chore' || type === 'due_chore') ? item as ChoreItem | null : null
  const reminderItem = type === 'reminder' ? item as ReminderItem | null : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        backgroundColor: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderBottom: `4px solid ${cfg.slab}`,
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${cfg.slab}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconComponent size={22} color={cfg.iconColor} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {type === 'all_clear' ? (
          <>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', margin: 0 }}>You&apos;re on top of things.</p>
            <p style={{ fontWeight: 700, fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Nothing overdue or due today.</p>
          </>
        ) : choreItem ? (
          <>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{choreItem.title}</p>
            <p style={{ fontWeight: 700, fontSize: 12, color: cfg.iconColor, margin: '2px 0 0' }}>{cfg.label}</p>
          </>
        ) : reminderItem ? (
          <>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', margin: 0 }}>{reminderItem.title}</p>
            <p style={{ fontWeight: 700, fontSize: 12, color: cfg.iconColor, margin: '2px 0 0' }}>{cfg.label}</p>
          </>
        ) : null}
      </div>

      {choreItem && onCompleteChore && (
        <button
          onClick={() => onCompleteChore(choreItem.id)}
          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: cfg.slab, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          aria-label="Complete chore"
        >
          <CheckCircle2 size={16} color="#fff" />
        </button>
      )}
    </motion.div>
  )
}
