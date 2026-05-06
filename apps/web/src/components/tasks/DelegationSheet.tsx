'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

interface DelegationSheetProps {
  open: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
  currentUserId: string
  members: Member[]
}

function Avatar({ name, color, size = 32 }: { name: string; color: string | null; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color ?? '#6B7280',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.4 }}>{initials}</span>
    </div>
  )
}

export default function DelegationSheet({
  open, onClose, taskId, taskTitle, currentUserId, members,
}: DelegationSheetProps) {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string>('')

  const delegateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/tasks/${taskId}/delegate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: selectedId }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to delegate')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task delegated')
      onClose()
    },
    onError: (err: Error) => {
      toast.error('Could not delegate task', { description: err.message })
    },
  })

  const eligibleMembers = members.filter(m => m.role !== 'child' && m.userId !== currentUserId)

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Delegate task
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
          {taskTitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {eligibleMembers.length === 0 && (
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No other members to delegate to.
            </p>
          )}
          {eligibleMembers.map(m => {
            const active = selectedId === m.userId
            return (
              <motion.button
                key={m.userId}
                whileTap={{ y: 1 }}
                type="button"
                onClick={() => setSelectedId(m.userId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
                  borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border)'}`,
                  backgroundColor: active ? `${COLOR}10` : 'var(--roost-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Avatar name={m.name} color={m.avatarColor} size={36} />
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--roost-text-primary)' }}>
                    {m.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', textTransform: 'capitalize' }}>
                    {m.role}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => delegateMutation.mutate()}
          disabled={!selectedId || delegateMutation.isPending || eligibleMembers.length === 0}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            border: 'none',
            borderBottom: `3px solid ${COLOR_DARK}`,
            backgroundColor: selectedId ? COLOR : 'var(--roost-border)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: selectedId ? 'pointer' : 'default',
            opacity: delegateMutation.isPending ? 0.7 : 1,
          }}
        >
          {delegateMutation.isPending ? 'Delegating...' : 'Delegate task'}
        </button>
      </div>
    </DraggableSheet>
  )
}
