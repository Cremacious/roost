'use client'

import { useState } from 'react'
import { Check, Circle, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

export interface Subtask {
  id: string
  title: string
  completed: boolean
  completedBy: string | null
  completedAt: string | null
  createdBy: string
  priority: 'low' | 'medium' | 'high'
}

interface SubtaskListProps {
  parentTaskId: string
  subtasks: Subtask[]
  currentUserId: string
  isAdmin: boolean
  isChild: boolean
}

export default function SubtaskList({
  parentTaskId,
  subtasks,
  currentUserId,
  isAdmin,
  isChild,
}: SubtaskListProps) {
  const qc = useQueryClient()
  const [addingTitle, setAddingTitle] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const r = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      if (!r.ok) throw new Error('Failed to update subtask')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => toast.error('Could not update subtask', { description: 'Please try again.' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete subtask')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => toast.error('Could not delete subtask', { description: 'Please try again.' }),
  })

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, parentTaskId, priority: 'medium' }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to add subtask')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setAddingTitle('')
      setShowAdd(false)
    },
    onError: (err: Error) => toast.error('Could not add subtask', { description: err.message }),
  })

  function handleAddSubmit() {
    if (!addingTitle.trim()) return
    addMutation.mutate(addingTitle.trim())
  }

  const completedCount = subtasks.filter(s => s.completed).length

  return (
    <div style={{ marginTop: 4 }}>
      {subtasks.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
            {completedCount}/{subtasks.length} done
          </span>
          <div style={{
            height: 3, borderRadius: 2, backgroundColor: 'var(--roost-border)',
            marginTop: 4, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2, backgroundColor: COLOR,
              width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%`,
              transition: 'width 0.2s',
            }} />
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {subtasks.map(sub => {
          const canDelete = isAdmin || sub.createdBy === currentUserId
          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 24,
                paddingTop: 6,
                paddingBottom: 6,
                borderLeft: `2px solid ${COLOR}30`,
                marginLeft: 4,
              }}
            >
              {!isChild && (
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ id: sub.id, completed: !sub.completed })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  aria-label={sub.completed ? 'Uncheck subtask' : 'Complete subtask'}
                >
                  {sub.completed
                    ? <Check size={16} color={COLOR} />
                    : <Circle size={16} color={`${COLOR}66`} />
                  }
                </button>
              )}
              <span style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                color: sub.completed ? 'var(--roost-text-muted)' : 'var(--roost-text-primary)',
                textDecoration: sub.completed ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {sub.title}
              </span>
              {canDelete && !isChild && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(sub.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                  aria-label="Delete subtask"
                >
                  <Trash2 size={12} color="var(--roost-text-muted)" />
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {!isChild && (
        <AnimatePresence>
          {showAdd ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              style={{ paddingLeft: 24, marginLeft: 4, borderLeft: `2px solid ${COLOR}30`, marginTop: 4 }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  autoFocus={false}
                  value={addingTitle}
                  onChange={e => setAddingTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSubmit()
                    if (e.key === 'Escape') { setShowAdd(false); setAddingTitle('') }
                  }}
                  placeholder="Subtask title"
                  style={{
                    flex: 1,
                    border: 'none',
                    borderBottom: `2px solid ${COLOR}`,
                    borderRadius: 0,
                    padding: '4px 2px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: 'transparent',
                    color: 'var(--roost-text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSubmit}
                  disabled={!addingTitle.trim() || addMutation.isPending}
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    border: 'none',
                    backgroundColor: addingTitle.trim() ? COLOR : 'var(--roost-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: addingTitle.trim() ? 'pointer' : 'default',
                  }}
                >
                  <Check size={12} color="#fff" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                marginTop: 2,
              }}
            >
              <Plus size={12} color={COLOR} />
              <span style={{ fontSize: 12, fontWeight: 700, color: COLOR }}>Add subtask</span>
            </button>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
