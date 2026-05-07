'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'
import type { Project } from './TaskTabRow'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

const SWATCHES = [
  '#EC4899', '#EF4444', '#F97316', '#F59E0B',
  '#22C55E', '#3B82F6', '#A855F7', '#06B6D4',
]

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#374151', marginBottom: 6, display: 'block',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--roost-border)',
  borderBottom: '3px solid var(--roost-border)', borderRadius: 12,
  padding: '12px 14px', fontSize: 15, fontWeight: 600,
  backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)',
  outline: 'none', boxSizing: 'border-box',
}

interface ProjectSettingsSheetProps {
  open: boolean
  onClose: () => void
  project: Project | null
  isAdmin: boolean
  onDeleted?: () => void
}

export default function ProjectSettingsSheet({
  open, onClose, project, isAdmin, onDeleted,
}: ProjectSettingsSheetProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(COLOR)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open && project) {
      setName(project.name)
      setColor(project.color)
      setConfirmDelete(false)
    }
  }, [open, project])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/tasks/projects/${project!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to update project')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Project updated')
      onClose()
    },
    onError: (err: Error) => toast.error('Could not update project', { description: err.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/tasks/projects/${project!.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to delete project')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Project deleted')
      onDeleted?.()
      onClose()
    },
    onError: (err: Error) => toast.error('Could not delete project', { description: err.message }),
  })

  if (!project) return null

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={project.color}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Project settings
        </p>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Name</label>
          <input
            style={INPUT_STYLE}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveMutation.mutate()}
          />
        </div>

        {/* Color */}
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL_STYLE}>Color</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {SWATCHES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setColor(s)}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  backgroundColor: s,
                  border: color === s ? '3px solid var(--roost-text-primary)' : '2px solid transparent',
                  cursor: 'pointer', padding: 0, outline: 'none',
                }}
                aria-label={`Color ${s}`}
              />
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14,
            border: 'none', borderBottom: `3px solid ${color}CC`,
            backgroundColor: color, color: '#fff',
            fontWeight: 800, fontSize: 15,
            cursor: name.trim() ? 'pointer' : 'default',
            opacity: saveMutation.isPending ? 0.7 : 1,
            marginBottom: 16,
          }}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save changes'}
        </button>

        {/* Delete (admin only) */}
        {isAdmin && (
          <div>
            {confirmDelete ? (
              <div style={{
                backgroundColor: 'var(--roost-bg)',
                border: '1.5px solid #EF4444',
                borderRadius: 12,
                padding: '12px 14px',
              }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#EF4444' }}>
                  Delete this project? Tasks will remain but lose their project assignment.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      border: 'none', backgroundColor: '#EF4444',
                      color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      border: '1.5px solid var(--roost-border)',
                      backgroundColor: 'var(--roost-surface)',
                      color: 'var(--roost-text-secondary)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <motion.button
                whileTap={{ y: 1 }}
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 0', borderRadius: 12,
                  border: '1.5px solid var(--roost-border)',
                  backgroundColor: 'var(--roost-surface)',
                  color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                <Trash2 size={15} />
                Delete project
              </motion.button>
            )}
          </div>
        )}
      </div>
    </DraggableSheet>
  )
}
