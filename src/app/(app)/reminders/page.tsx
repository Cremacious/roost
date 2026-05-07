'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Bell, Pencil, Trash2, Check, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { SlabCard } from '@/components/ui/SlabCard'
import { ReminderSheet, type ReminderData, type Member } from '@/components/reminders/ReminderSheet'

const COLOR = SECTION_COLORS.reminders.base
const COLOR_DARK = SECTION_COLORS.reminders.dark

interface Reminder {
  id: string
  title: string
  note: string | null
  remindAt: string
  nextRemindAt: string
  frequency: string | null
  notifyType: string
  notifyUserIds: string
  completed: boolean
  snoozedUntil: string | null
  createdBy: string
  householdId: string
}

function isSnoozed(r: Reminder) {
  if (!r.snoozedUntil) return false
  return new Date(r.snoozedUntil) > new Date()
}

function isOverdue(r: Reminder) {
  return !r.completed && !isSnoozed(r) && new Date(r.nextRemindAt) < new Date()
}

function isDueToday(r: Reminder) {
  if (r.completed || isSnoozed(r)) return false
  const d = new Date(r.nextRemindAt)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  return d >= today && d < tomorrow
}

function dueDateStr(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function freqLabel(f: string | null) {
  if (!f || f === 'once') return ''
  return f.charAt(0).toUpperCase() + f.slice(1)
}

function ReminderRow({ reminder, canModify, onComplete, onUndo, onEdit, onDelete }: {
  reminder: Reminder; canModify: boolean
  onComplete: (id: string) => void; onUndo: (id: string) => void
  onEdit: (r: Reminder) => void; onDelete: (id: string) => void
}) {
  const snoozed = isSnoozed(reminder)

  return (
    <SlabCard color={reminder.completed || snoozed ? 'var(--roost-border-bottom)' : COLOR} style={{ opacity: reminder.completed || snoozed ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 64 }}>
        <motion.button
          whileTap={{ scale: 0.85 }} type="button"
          onClick={() => reminder.completed ? onUndo(reminder.id) : onComplete(reminder.id)}
          disabled={snoozed}
          style={{ background: 'none', border: 'none', cursor: snoozed ? 'default' : 'pointer', padding: 0, flexShrink: 0 }}
        >
          {snoozed ? <Clock size={22} color={COLOR} /> : reminder.completed ? <Check size={22} color={COLOR} /> : <Bell size={22} color={`${COLOR}66`} />}
        </motion.button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: reminder.completed ? 'var(--roost-text-muted)' : 'var(--roost-text-primary)', textDecoration: reminder.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reminder.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
              {snoozed ? `Resets ${dueDateStr(reminder.snoozedUntil!)}` : dueDateStr(reminder.nextRemindAt)}
            </span>
            {freqLabel(reminder.frequency) && (
              <span style={{ fontSize: 11, fontWeight: 800, color: COLOR, backgroundColor: `${COLOR}18`, padding: '1px 7px', borderRadius: 8 }}>
                {freqLabel(reminder.frequency)}
              </span>
            )}
          </div>
        </div>

        {canModify && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {!reminder.completed && !snoozed && (
              <motion.button whileTap={{ y: 1 }} type="button" onClick={() => onEdit(reminder)}
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pencil size={14} color="var(--roost-text-secondary)" />
              </motion.button>
            )}
            <motion.button whileTap={{ y: 1 }} type="button" onClick={() => onDelete(reminder.id)}
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={14} color="#EF4444" />
            </motion.button>
          </div>
        )}
      </div>
    </SlabCard>
  )
}

function SectionHeader({ label, count, color, collapsed, onToggle }: { label: string; count: number; color: string; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <button type="button" onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: onToggle ? 'pointer' : 'default', padding: '4px 0', width: '100%' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', backgroundColor: color, borderRadius: 20, padding: '1px 7px' }}>{count}</span>
      {onToggle && <span style={{ marginLeft: 'auto', color }}>{collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</span>}
    </button>
  )
}

export default function RemindersPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const qc = useQueryClient()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editReminder, setEditReminder] = useState<Reminder | null>(null)
  const [completedCollapsed, setCompletedCollapsed] = useState(true)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const r = await fetch('/api/reminders')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ reminders: Reminder[] }>
    },
    staleTime: 10_000,
    refetchInterval: 60_000,
  })

  const { data: householdData } = useQuery({
    queryKey: ['household-me'],
    queryFn: async () => {
      const r = await fetch('/api/household/me')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 60_000,
  })
  const myRole = householdData?.role ?? 'member'
  const isAdmin = myRole === 'admin'

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/reminders/${id}/complete`, { method: 'POST' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
    onError: () => toast.error('Could not complete reminder', { description: 'Please try again.' }),
  })

  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/reminders/${id}/complete`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
    onError: (e) => toast.error('Could not undo', { description: (e as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success('Reminder deleted') },
    onError: () => toast.error('Could not delete reminder', { description: 'Please try again.' }),
  })

  const reminders = data?.reminders ?? []
  const active = reminders.filter(r => !r.completed)
  const overdue = active.filter(r => isOverdue(r))
  const today = active.filter(r => !isOverdue(r) && isDueToday(r))
  const upcoming = active.filter(r => !isOverdue(r) && !isDueToday(r) && !isSnoozed(r))
  const snoozed = active.filter(r => isSnoozed(r))
  const completed = reminders.filter(r => r.completed)

  const hasAny = reminders.length > 0

  const members: Member[] = (householdData?.members ?? []).map((m: { userId: string; name: string; avatarColor: string | null }) => ({
    userId: m.userId,
    name: m.name,
    avatarColor: m.avatarColor,
  }))

  function toReminderData(r: Reminder): ReminderData {
    return {
      id: r.id,
      title: r.title,
      note: r.note,
      remindAt: r.remindAt,
      frequency: r.frequency,
      notifyType: r.notifyType,
      notifyUserIds: r.notifyUserIds,
      createdBy: r.createdBy,
    }
  }

  function renderGroup(items: Reminder[], label: string, color: string, opts?: { collapsed?: boolean; onToggle?: () => void }) {
    if (items.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader label={label} count={items.length} color={color} {...opts} />
        {!opts?.collapsed && items.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}>
            <ReminderRow
              reminder={r}
              canModify={isAdmin || r.createdBy === currentUserId}
              onComplete={id => completeMutation.mutate(id)}
              onUndo={id => undoMutation.mutate(id)}
              onEdit={rem => { setEditReminder(rem); setSheetOpen(true) }}
              onDelete={id => deleteMutation.mutate(id)}
            />
          </motion.div>
        ))}
      </div>
    )
  }

  if (isLoading) return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => <div key={i} style={{ height: 64, borderRadius: 16, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid var(--roost-border)' }} />)}
    </div>
  )

  if (isError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, padding: 24 }}>
      <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)', margin: 0 }}>Something went wrong.</p>
    </div>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ padding: '20px 16px 100px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>Reminders</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{active.length} active</p>
          </div>
          <motion.button whileTap={{ y: 2 }} type="button" onClick={() => { setEditReminder(null); setSheetOpen(true) }}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLOR, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={20} color="#fff" />
          </motion.button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!hasAny && (
            <div style={{ backgroundColor: 'var(--roost-surface)', border: '2px dashed var(--roost-border)', borderBottom: '4px dashed var(--roost-border-bottom)', borderRadius: 16, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={24} color={COLOR} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>Nothing pending.</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>No reminders set. Bold move.</p>
              <motion.button whileTap={{ y: 2 }} type="button" onClick={() => { setEditReminder(null); setSheetOpen(true) }}
                style={{ marginTop: 8, padding: '11px 20px', borderRadius: 12, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Add a reminder
              </motion.button>
            </div>
          )}
          {renderGroup(overdue, 'Overdue', '#EF4444')}
          {renderGroup(today, 'Today', '#F97316')}
          {renderGroup(upcoming, 'Upcoming', COLOR)}
          {renderGroup(snoozed, 'Snoozed', 'var(--roost-text-muted)')}
          {renderGroup(completed, 'Completed', 'var(--roost-text-muted)', { collapsed: completedCollapsed, onToggle: () => setCompletedCollapsed(v => !v) })}
        </div>
      </motion.div>

      <ReminderSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditReminder(null) }}
        reminder={editReminder ? toReminderData(editReminder) : null}
        members={members}
      />
    </>
  )
}
