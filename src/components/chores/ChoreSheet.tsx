'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
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
}

const FREQUENCIES = [
  { value: 'daily',    label: 'Daily' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly',  label: 'Monthly' },
]

export default function ChoreSheet({ open, onClose, chore, members, isAdmin }: ChoreSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!chore?.id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [assignedTo, setAssignedTo] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(chore?.title ?? '')
      setDescription(chore?.description ?? '')
      setFrequency(chore?.frequency ?? 'weekly')
      setAssignedTo(chore?.assignedTo ?? '')
    }
  }, [open, chore])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        frequency,
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
        throw new Error(d.error ?? 'Failed to save chore')
      }
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      toast.success(isEditing ? 'Chore updated' : 'Chore added')
      onClose()
    },
    onError: (err: Error) => {
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
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
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
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
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
                border: '1.5px solid #FCA5A5',
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
