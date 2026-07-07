'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.chores.base
const COLOR_DARK = SECTION_COLORS.chores.dark

export interface ChoreData {
  id?: string
  title: string
  description: string | null
  frequency: string
  customDays: string | null
  nextDueAt?: string | null
  assignedTo: string | null
}

interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

interface ChoreSheetProps {
  open: boolean
  onClose: () => void
  chore?: ChoreData | null
  members: Member[]
  isAdmin: boolean
  isPremium?: boolean
  onUpgradeRequired?: (code: string) => void
}

const FREQUENCIES = [
  { value: 'daily',    label: 'Daily' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly',  label: 'Monthly' },
]

const WEEKDAYS = [
  { value: 0, short: 'S', name: 'Sunday' },
  { value: 1, short: 'M', name: 'Monday' },
  { value: 2, short: 'T', name: 'Tuesday' },
  { value: 3, short: 'W', name: 'Wednesday' },
  { value: 4, short: 'T', name: 'Thursday' },
  { value: 5, short: 'F', name: 'Friday' },
  { value: 6, short: 'S', name: 'Saturday' },
]

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function ChoreSheet({ open, onClose, chore, members, isAdmin, isPremium = false, onUpgradeRequired }: ChoreSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!chore?.id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [assignedTo, setAssignedTo] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState(() => new Date().getDay())
  const [dayOfMonth, setDayOfMonth] = useState(() => new Date().getDate())
  const [startDate, setStartDate] = useState(() => toDateInput(new Date()))

  // Re-seed form state when the sheet opens or the chore being edited changes.
  const [prevOpen, setPrevOpen] = useState(false)
  const [prevChore, setPrevChore] = useState<ChoreData | null | undefined>(null)
  if (open !== prevOpen || chore !== prevChore) {
    setPrevOpen(open)
    setPrevChore(chore)
    if (open) {
      const today = new Date()
      const freq = chore?.frequency ?? (isPremium ? 'weekly' : 'daily')
      const due = chore?.nextDueAt ? new Date(chore.nextDueAt) : null
      const cd = chore?.customDays ?? null
      const hasDay = cd != null && cd !== ''

      setTitle(chore?.title ?? '')
      setDescription(chore?.description ?? '')
      setFrequency(freq)
      setAssignedTo(chore?.assignedTo ?? '')
      setDayOfWeek(hasDay && (freq === 'weekly' || freq === 'biweekly') ? Number(cd) : (due ? due.getDay() : today.getDay()))
      setDayOfMonth(hasDay && freq === 'monthly' ? Number(cd) : (due ? due.getDate() : today.getDate()))
      setStartDate(due ? toDateInput(due) : toDateInput(today))
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      let customDays: string | null = null
      if (frequency === 'weekly' || frequency === 'biweekly') customDays = String(dayOfWeek)
      else if (frequency === 'monthly') customDays = String(dayOfMonth)

      const body = {
        title: title.trim(),
        description: description.trim() || null,
        frequency,
        customDays,
        startDate,
        assignedTo: assignedTo || null,
      }
      const url = isEditing ? `/api/chores/${chore!.id}` : '/api/chores'
      const method = isEditing ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        const err = new Error(d.error ?? 'Failed to save chore') as Error & { code?: string }
        err.code = d.code
        throw err
      }
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      toast.success(isEditing ? 'Chore updated' : 'Chore added')
      onClose()
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code && onUpgradeRequired) {
        onClose()
        onUpgradeRequired(err.code)
        return
      }
      toast.error('Could not save chore', { description: err.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/chores/${chore!.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete chore')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      toast.success('Chore deleted')
      onClose()
    },
    onError: () => {
      toast.error('Could not delete chore', { description: 'Something went wrong. Try again.' })
    },
  })

  const canDelete = isEditing && isAdmin

  function handleSave() {
    if (!title.trim()) {
      toast.error('Title required', { description: 'Give the chore a name.' })
      return
    }
    saveMutation.mutate()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    fontSize: 15,
    fontWeight: 600,
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    color: '#374151',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  }

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div style={{ padding: '4px 16px 32px' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 20 }}>
          {isEditing ? 'Edit chore' : 'Add chore'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Vacuum the living room"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any extra details for the person doing it"
            />
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FREQUENCIES.map(f => {
                const active = frequency === f.value
                const locked = !isPremium && f.value !== 'daily'
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-disabled={locked}
                    onClick={() => {
                      if (locked) { onUpgradeRequired?.('RECURRING_CHORES_PREMIUM'); return }
                      setFrequency(f.value)
                    }}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
                      borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                      backgroundColor: active ? COLOR : 'var(--roost-surface)',
                      color: active ? '#fff' : 'var(--roost-text-secondary)',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      opacity: locked ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {locked && <Lock size={13} />}
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day-of-week picker (weekly / biweekly) */}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <div>
              <label style={labelStyle}>Repeats on</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {WEEKDAYS.map(d => {
                  const active = dayOfWeek === d.value
                  return (
                    <button
                      key={d.value}
                      type="button"
                      aria-label={d.name}
                      aria-pressed={active}
                      onClick={() => setDayOfWeek(d.value)}
                      style={{
                        height: 44,
                        borderRadius: 12,
                        border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
                        borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                        backgroundColor: active ? COLOR : 'var(--roost-surface)',
                        color: active ? '#fff' : 'var(--roost-text-secondary)',
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {d.short}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Day-of-month picker (monthly) */}
          {frequency === 'monthly' && (
            <div>
              <label style={labelStyle}>Day of the month</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Number(e.target.value))}
                onFocus={e => { e.currentTarget.style.borderColor = COLOR; e.currentTarget.style.borderBottomColor = COLOR_DARK }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--roost-border)'; e.currentTarget.style.borderBottomColor = 'var(--roost-border-bottom)' }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {ordinal(n)}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)', marginTop: 6 }}>
                In shorter months it runs on the last day instead.
              </p>
            </div>
          )}

          {/* Starts on */}
          <div>
            <label style={labelStyle}>Starts on</label>
            <input
              type="date"
              style={inputStyle}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = COLOR; e.currentTarget.style.borderBottomColor = COLOR_DARK }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--roost-border)'; e.currentTarget.style.borderBottomColor = 'var(--roost-border-bottom)' }}
            />
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)', marginTop: 6 }}>
              The first time this chore is due, on or after this date.
            </p>
          </div>

          {/* Assign to */}
          <div>
            <label style={labelStyle}>Assign to</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
            >
              <option value="">Anyone</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Save */}
          <motion.button
            type="button"
            data-testid="chore-save-btn"
            whileTap={{ y: 2 }}
            onClick={handleSave}
            disabled={saveMutation.isPending}
            style={{
              height: 52,
              borderRadius: 14,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `4px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: saveMutation.isPending ? 0.7 : 1,
            }}
          >
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Add chore'}
          </motion.button>

          {/* Delete */}
          {canDelete && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{
                height: 44,
                borderRadius: 12,
                border: '1.5px solid #FECACA',
                borderBottom: '3px solid #FCA5A5',
                backgroundColor: 'transparent',
                color: '#EF4444',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={15} />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete chore'}
            </button>
          )}
        </div>
      </div>
    </DraggableSheet>
  )
}
