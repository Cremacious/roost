'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = SECTION_COLORS.reminders.base
const COLOR_DARK = SECTION_COLORS.reminders.dark

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#374151',
  marginBottom: 6,
  display: 'block',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--roost-border)',
  borderBottom: '3px solid var(--roost-border)',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 15,
  fontWeight: 600,
  backgroundColor: 'var(--roost-surface)',
  color: 'var(--roost-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const NOTIFY_TYPES = [
  { value: 'self', label: 'Just me' },
  { value: 'household', label: 'Everyone' },
  { value: 'specific', label: 'Specific people' },
]

export interface ReminderData {
  id: string
  title: string
  note: string | null
  remindAt: string
  frequency: string | null
  notifyType: string
  notifyUserIds: string
  createdBy: string
}

export interface Member {
  userId: string
  name: string
  avatarColor: string | null
}

interface ReminderSheetProps {
  open: boolean
  onClose: () => void
  reminder?: ReminderData | null
  members: Member[]
}

export function ReminderSheet({ open, onClose, reminder, members }: ReminderSheetProps) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [frequency, setFrequency] = useState('once')
  const [notifyType, setNotifyType] = useState('self')
  const [notifyUserIds, setNotifyUserIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setTitle(reminder?.title ?? '')
      setNote(reminder?.note ?? '')
      setRemindAt(reminder?.remindAt ? new Date(reminder.remindAt).toISOString().slice(0, 16) : '')
      setFrequency(reminder?.frequency ?? 'once')
      setNotifyType(reminder?.notifyType ?? 'self')
      setNotifyUserIds(JSON.parse(reminder?.notifyUserIds ?? '[]') as string[])
    }
  }, [open, reminder])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = reminder ? `/api/reminders/${reminder.id}` : '/api/reminders'
      const method = reminder ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim() || null,
          remindAt: new Date(remindAt).toISOString(),
          frequency,
          notifyType,
          notifyUserIds,
        }),
      })
      if (!r.ok) {
        const data = await r.json()
        const err = new Error(data.error ?? 'Failed to save reminder') as Error & { code?: string }
        err.code = data.code
        throw err
      }
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      toast.success(reminder ? 'Reminder updated' : 'Reminder set')
      onClose()
    },
    onError: (err: Error) => {
      toast.error('Could not save reminder', { description: err.message })
    },
  })

  function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required', { description: 'Name your reminder before saving.' })
      return
    }
    if (!remindAt) {
      toast.error('Date is required', { description: 'Pick when you want to be reminded.' })
      return
    }
    saveMutation.mutate()
  }

  function toggleMember(userId: string) {
    setNotifyUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const otherMembers = members.filter(m => m.userId !== currentUserId)

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          {reminder ? 'Edit reminder' : 'New reminder'}
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Title</label>
          <input
            style={INPUT_STYLE}
            placeholder="What do you need to remember?"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Note</label>
          <textarea
            style={{ ...INPUT_STYLE, minHeight: 72, resize: 'vertical' }}
            placeholder="Any extra details..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Remind at</label>
          <input
            type="datetime-local"
            style={INPUT_STYLE}
            value={remindAt}
            onChange={e => setRemindAt(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Repeat</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FREQUENCIES.map(f => {
              const active = frequency === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  style={{
                    flex: '1 1 80px',
                    padding: '10px 0',
                    borderRadius: 10,
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                    backgroundColor: active ? COLOR : 'var(--roost-surface)',
                    color: active ? '#fff' : 'var(--roost-text-secondary)',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={LABEL_STYLE}>Notify</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: notifyType === 'specific' ? 12 : 0 }}>
            {NOTIFY_TYPES.map(n => {
              const active = notifyType === n.value
              return (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => setNotifyType(n.value)}
                  style={{
                    flex: '1 1 100px',
                    padding: '10px 0',
                    borderRadius: 10,
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                    backgroundColor: active ? COLOR : 'var(--roost-surface)',
                    color: active ? '#fff' : 'var(--roost-text-secondary)',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {n.label}
                </button>
              )
            })}
          </div>

          {notifyType === 'specific' && otherMembers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {otherMembers.map(m => {
                const selected = notifyUserIds.includes(m.userId)
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggleMember(m.userId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: selected ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                      backgroundColor: selected ? `${COLOR}14` : 'var(--roost-surface)',
                      cursor: 'pointer',
                      minHeight: 48,
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: m.avatarColor ?? COLOR,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: selected ? COLOR : 'var(--roost-text-primary)',
                        flex: 1,
                      }}
                    >
                      {m.name}
                    </span>
                    {selected && (
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: COLOR,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {notifyType === 'specific' && otherMembers.length === 0 && (
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', marginTop: 8 }}>
              No other members to notify.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            border: 'none',
            borderBottom: `3px solid ${COLOR_DARK}`,
            backgroundColor: COLOR,
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: saveMutation.isPending ? 0.7 : 1,
          }}
        >
          {saveMutation.isPending ? 'Saving...' : reminder ? 'Save changes' : 'Set reminder'}
        </button>
      </div>
    </DraggableSheet>
  )
}
