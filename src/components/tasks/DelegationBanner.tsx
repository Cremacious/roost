'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

export interface PendingDelegation {
  id: string
  taskId: string
  taskTitle: string
  fromUserName: string
  fromUserAvatar: string | null
  createdAt: string
}

interface DelegationBannerProps {
  delegations: PendingDelegation[]
}

function Avatar({ name, color, size = 22 }: { name: string; color: string | null; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color ?? '#6B7280',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.42 }}>{initials}</span>
    </div>
  )
}

function DelegationRow({ delegation }: { delegation: PendingDelegation }) {
  const qc = useQueryClient()

  const respondMutation = useMutation({
    mutationFn: async (status: 'accepted' | 'declined') => {
      const r = await fetch(`/api/tasks/delegations/${delegation.id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to respond')
      return status
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(status === 'accepted' ? 'Task accepted' : 'Task declined')
    },
    onError: (err: Error) => {
      toast.error('Could not respond', { description: err.message })
    },
  })

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid var(--roost-border)',
    }}>
      <Avatar name={delegation.fromUserName} color={delegation.fromUserAvatar} size={28} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {delegation.taskTitle}
        </p>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
          From {delegation.fromUserName.split(' ')[0]}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <motion.button
          whileTap={{ y: 1 }}
          type="button"
          onClick={() => respondMutation.mutate('accepted')}
          disabled={respondMutation.isPending}
          style={{
            width: 32, height: 32, borderRadius: 10,
            border: 'none', borderBottom: `2px solid ${COLOR_DARK}`,
            backgroundColor: COLOR,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Accept"
        >
          <Check size={14} color="#fff" strokeWidth={2.5} />
        </motion.button>
        <motion.button
          whileTap={{ y: 1 }}
          type="button"
          onClick={() => respondMutation.mutate('declined')}
          disabled={respondMutation.isPending}
          style={{
            width: 32, height: 32, borderRadius: 10,
            border: '1.5px solid var(--roost-border)',
            borderBottom: '2px solid var(--roost-border)',
            backgroundColor: 'var(--roost-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Decline"
        >
          <X size={14} color="var(--roost-text-muted)" />
        </motion.button>
      </div>
    </div>
  )
}

export default function DelegationBanner({ delegations }: DelegationBannerProps) {
  if (delegations.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: `1.5px solid ${COLOR}40`,
        borderBottom: `4px solid ${COLOR_DARK}`,
        borderRadius: 16,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <ArrowRight size={14} color={COLOR} />
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: COLOR, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Assigned to you
        </p>
      </div>

      {delegations.map(d => (
        <DelegationRow key={d.id} delegation={d} />
      ))}
    </motion.div>
  )
}
