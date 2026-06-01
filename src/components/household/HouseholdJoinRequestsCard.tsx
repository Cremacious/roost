'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { relativeTime } from '@/lib/utils/time'
import MemberAvatar from '@/components/shared/MemberAvatar'

interface JoinRequest {
  id: string
  type: 'code' | 'invite'
  createdAt: string
  userId: string
  name: string
  avatarColor: string | null
}

export default function HouseholdJoinRequestsCard() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['join-requests'],
    queryFn: async () => {
      const res = await fetch('/api/household/join-requests')
      if (!res.ok) return { requests: [] }
      return res.json() as Promise<{ requests: JoinRequest[] }>
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const requests = data?.requests ?? []

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/household/join-requests/${id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to approve')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('Member approved')
    },
    onError: () => {
      toast.error('Failed to approve request', { description: 'Please try again.' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/household/join-requests/${id}/reject`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reject')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] })
      toast.success('Request declined')
    },
    onError: () => {
      toast.error('Failed to decline request', { description: 'Please try again.' })
    },
  })

  if (requests.length === 0) return null

  return (
    <div>
      <p
        className="text-sm mb-3"
        style={{ color: 'var(--roost-text-primary)', fontWeight: 700 }}
      >
        Pending Requests ({requests.length})
      </p>
      <div className="space-y-2">
        {requests.map(req => (
          <motion.div
            key={req.id}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
            }}
          >
            <MemberAvatar
              name={req.name}
              color={req.avatarColor ?? '#6B7280'}
              size="sm"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--roost-text-primary)', margin: 0 }}>
                {req.name}
              </p>
              <p style={{ fontWeight: 600, fontSize: 11, color: 'var(--roost-text-muted)', margin: 0 }}>
                Requested {relativeTime(new Date(req.createdAt))}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => approveMutation.mutate(req.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                aria-label={`Approve ${req.name}`}
                style={{
                  height: 40,
                  width: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: '#22C55E',
                  border: '1.5px solid #16A34A',
                  borderBottom: '3px solid #15803D',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Check size={14} color="#ffffff" strokeWidth={2.5} />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => rejectMutation.mutate(req.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                aria-label={`Decline ${req.name}`}
                style={{
                  height: 40,
                  width: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  color: '#EF4444',
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
