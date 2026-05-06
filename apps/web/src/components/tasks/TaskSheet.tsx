'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

export interface TaskData {
  id?: string
  title: string
  description: string | null
  assignedTo: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high'
}

interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

interface TaskSheetProps {
  open: boolean
  onClose: () => void
  task?: TaskData | null
  members: Member[]
  isAdmin: boolean
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

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
  borderBottom: `3px solid var(--roost-border)`,
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 15,
  fontWeight: 600,
  backgroundColor: 'var(--roost-surface)',
  color: 'var(--roost-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function TaskSheet({ open, onClose, task, members, isAdmin }: TaskSheetProps) {
  const qc = useQueryClient()
  const isEditing = !!task?.id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '')
      setDescription(task?.description ?? '')
      setAssignedTo(task?.assignedTo ?? '')
      setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '')
      setPriority(task?.priority ?? 'medium')
    }
  }, [open, task])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
        priority,
      }
      if (isEditing) {
        const r = await fetch(`/api/tasks/${task!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to update task')
        return r.json()
      } else {
        const r = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) {
          const data = await r.json()
          const err = new Error(data.error ?? 'Failed to create task') as Error & { code?: string }
          err.code = data.code
          throw err
        }
        return r.json()
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(isEditing ? 'Task updated' : 'Task added')
      onClose()
    },
    onError: (err: Error) => {
      toast.error(isEditing ? 'Could not update task' : 'Could not add task', {
        description: err.message,
      })
    },
  })

  function handleSubmit() {
    if (!title.trim()) {
      toast.error('Title is required', { description: 'Give the task a name.' })
      return
    }
    saveMutation.mutate()
  }

  const nonChildMembers = members.filter(m => m.role !== 'child')

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          {isEditing ? 'Edit task' : 'New task'}
        </p>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Title</label>
          <input
            style={INPUT_STYLE}
            placeholder="e.g. Buy a new shower curtain"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Notes</label>
          <textarea
            style={{ ...INPUT_STYLE, minHeight: 72, resize: 'vertical' }}
            placeholder="Any extra details..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Assign to */}
        {(isAdmin || nonChildMembers.length > 1) && (
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_STYLE}>Assign to</label>
            <select
              style={{ ...INPUT_STYLE, appearance: 'none' }}
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {nonChildMembers.map(m => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Due date */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Due date</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              style={{ ...INPUT_STYLE, flex: 1 }}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--roost-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 4px',
                  flexShrink: 0,
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Priority */}
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL_STYLE}>Priority</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PRIORITIES.map(p => {
              const active = priority === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                    backgroundColor: active ? COLOR : 'var(--roost-surface)',
                    color: active ? '#fff' : 'var(--roost-text-secondary)',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSubmit}
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
          {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Add task'}
        </button>
      </div>
    </DraggableSheet>
  )
}
