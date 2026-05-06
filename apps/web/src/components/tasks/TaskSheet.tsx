'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Lock, RefreshCw } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'
import type { Project } from './TaskTabRow'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

export interface TaskData {
  id?: string
  title: string
  description: string | null
  assignedTo: string | null
  dueDate: string | null
  dueTime: string | null
  priority: 'low' | 'medium' | 'high'
  projectId: string | null
  recurring: boolean
  frequency: string | null
  repeatEndType: string | null
  repeatUntil: string | null
  repeatOccurrences: number | null
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
  projects?: Project[]
  isAdmin: boolean
  isPremium?: boolean
  onUpgradeRequired?: (code: string) => void
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
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

export default function TaskSheet({
  open, onClose, task, members, projects = [], isAdmin, isPremium, onUpgradeRequired,
}: TaskSheetProps) {
  const qc = useQueryClient()
  const isEditing = !!task?.id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [projectId, setProjectId] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [frequency, setFrequency] = useState('weekly')
  const [repeatEndType, setRepeatEndType] = useState<'forever' | 'until_date' | 'after_occurrences'>('forever')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [repeatOccurrences, setRepeatOccurrences] = useState('5')

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '')
      setDescription(task?.description ?? '')
      setAssignedTo(task?.assignedTo ?? '')
      setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '')
      setDueTime(task?.dueTime ?? '')
      setPriority(task?.priority ?? 'medium')
      setProjectId(task?.projectId ?? '')
      setRecurring(task?.recurring ?? false)
      setFrequency(task?.frequency ?? 'weekly')
      setRepeatEndType((task?.repeatEndType as typeof repeatEndType) ?? 'forever')
      setRepeatUntil(task?.repeatUntil ? task.repeatUntil.slice(0, 10) : '')
      setRepeatOccurrences(task?.repeatOccurrences?.toString() ?? '5')
    }
  }, [open, task])

  function handleRepeatToggle() {
    if (!recurring && !isPremium) {
      onUpgradeRequired?.('RECURRING_TASKS_PREMIUM')
      return
    }
    setRecurring(v => !v)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        priority,
        projectId: projectId || null,
        recurring,
      }
      if (recurring) {
        body.frequency = frequency
        body.repeatEndType = repeatEndType
        body.repeatUntil = repeatEndType === 'until_date' && repeatUntil ? repeatUntil : null
        body.repeatOccurrences = repeatEndType === 'after_occurrences' ? parseInt(repeatOccurrences) : null
      } else {
        body.frequency = null
        body.repeatEndType = null
        body.repeatUntil = null
        body.repeatOccurrences = null
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
    onError: (err: Error & { code?: string }) => {
      if (err.code && onUpgradeRequired) { onUpgradeRequired(err.code); return }
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
            style={{ ...INPUT_STYLE, minHeight: 64, resize: 'vertical' }}
            placeholder="Any extra details..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_STYLE}>Project</label>
            <select
              style={{ ...INPUT_STYLE, appearance: 'none' }}
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

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

        {/* Due date + time */}
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
                onClick={() => { setDueDate(''); setDueTime('') }}
                style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0,
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {dueDate && (
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_STYLE}>Due time (optional)</label>
            <input
              type="time"
              style={{ ...INPUT_STYLE }}
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
            />
          </div>
        )}

        {/* Priority */}
        <div style={{ marginBottom: 16 }}>
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
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                    backgroundColor: active ? COLOR : 'var(--roost-surface)',
                    color: active ? '#fff' : 'var(--roost-text-secondary)',
                    fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Recurring toggle */}
        <div style={{ marginBottom: recurring ? 16 : 24 }}>
          <button
            type="button"
            onClick={handleRepeatToggle}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              border: '1.5px solid var(--roost-border)',
              borderBottom: recurring ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
              backgroundColor: recurring ? `${COLOR}10` : 'var(--roost-surface)',
              cursor: 'pointer',
            }}
          >
            {isPremium
              ? <RefreshCw size={15} color={recurring ? COLOR : 'var(--roost-text-muted)'} />
              : <Lock size={15} color="var(--roost-text-muted)" />
            }
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: recurring ? COLOR : 'var(--roost-text-secondary)',
              flex: 1, textAlign: 'left',
            }}>
              Repeat
            </span>
            {!isPremium && (
              <span style={{
                fontSize: 10, fontWeight: 800, color: COLOR,
                backgroundColor: `${COLOR}18`, borderRadius: 20, padding: '2px 8px',
              }}>
                Premium
              </span>
            )}
          </button>
        </div>

        {/* Recurring fields */}
        {recurring && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Frequency</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FREQUENCIES.map(f => {
                  const active = frequency === f.value
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFrequency(f.value)}
                      style={{
                        padding: '7px 14px', borderRadius: 20,
                        border: '1.5px solid var(--roost-border)',
                        borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                        backgroundColor: active ? COLOR : 'var(--roost-surface)',
                        color: active ? '#fff' : 'var(--roost-text-secondary)',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>End</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { value: 'forever', label: 'Never' },
                  { value: 'until_date', label: 'On date' },
                  { value: 'after_occurrences', label: 'After N times' },
                ] as const).map(opt => {
                  const active = repeatEndType === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRepeatEndType(opt.value)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10,
                        border: '1.5px solid var(--roost-border)',
                        borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                        backgroundColor: active ? COLOR : 'var(--roost-surface)',
                        color: active ? '#fff' : 'var(--roost-text-secondary)',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {repeatEndType === 'until_date' && (
              <input
                type="date"
                style={INPUT_STYLE}
                value={repeatUntil}
                onChange={e => setRepeatUntil(e.target.value)}
                min={dueDate || undefined}
              />
            )}
            {repeatEndType === 'after_occurrences' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  max={99}
                  style={{ ...INPUT_STYLE, width: 80 }}
                  value={repeatOccurrences}
                  onChange={e => setRepeatOccurrences(e.target.value)}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
                  occurrences
                </span>
              </div>
            )}
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14,
            border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
            backgroundColor: COLOR, color: '#fff',
            fontWeight: 800, fontSize: 15,
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
