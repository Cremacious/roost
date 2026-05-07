'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SECTION_COLORS } from '@/lib/constants/colors'
import type { Project } from './TaskTabRow'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

const SWATCHES = [
  '#EC4899', '#EF4444', '#F97316', '#F59E0B',
  '#22C55E', '#3B82F6', '#A855F7', '#06B6D4',
]

interface ProjectCreateInlineProps {
  onCreated: (project: Project) => void
  onCancel: () => void
}

export default function ProjectCreateInline({ onCreated, onCancel }: ProjectCreateInlineProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(COLOR)

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/tasks/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (!r.ok) {
        const data = await r.json()
        const err = new Error(data.error ?? 'Failed to create project') as Error & { code?: string }
        err.code = data.code
        throw err
      }
      return r.json() as Promise<{ project: Project }>
    },
    onSuccess: ({ project }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success(`Project "${project.name}" created`)
      onCreated(project)
    },
    onError: (err: Error & { code?: string }) => {
      toast.error('Could not create project', { description: err.message })
    },
  })

  function handleSubmit() {
    if (!name.trim()) return
    createMutation.mutate()
  }

  return (
    <div style={{
      backgroundColor: 'var(--roost-surface)',
      border: '1.5px solid var(--roost-border)',
      borderBottom: `3px solid ${COLOR_DARK}`,
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>
        New project
      </p>

      {/* Color swatches */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SWATCHES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setColor(s)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: s,
              border: color === s ? '3px solid var(--roost-text-primary)' : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              flexShrink: 0,
            }}
            aria-label={`Color ${s}`}
          />
        ))}
      </div>

      {/* Name input + actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          autoFocus={false}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="Project name"
          style={{
            flex: 1,
            border: '1.5px solid var(--roost-border)',
            borderBottom: `2px solid ${color}`,
            borderRadius: 10,
            padding: '9px 12px',
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: 'var(--roost-surface)',
            color: 'var(--roost-text-primary)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || createMutation.isPending}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: 'none',
            borderBottom: `2px solid ${COLOR_DARK}`,
            backgroundColor: name.trim() ? COLOR : 'var(--roost-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: name.trim() ? 'pointer' : 'default',
            flexShrink: 0,
          }}
          aria-label="Create project"
        >
          <Check size={16} color="#fff" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1.5px solid var(--roost-border)',
            backgroundColor: 'var(--roost-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Cancel"
        >
          <X size={16} color="var(--roost-text-muted)" />
        </button>
      </div>
    </div>
  )
}
