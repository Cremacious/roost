'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function DevTools() {
  if (process.env.NODE_ENV !== 'development') return null

  return <DevToolsInner />
}

function DevToolsInner() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: householdData, isLoading } = useQuery<{ subscriptionStatus: string }>({
    queryKey: ['dev-household'],
    queryFn: async () => {
      const r = await fetch('/api/household/me')
      if (!r.ok) throw new Error('Failed')
      const d = await r.json()
      return d.household
    },
    staleTime: 0,
  })

  const isPremium = householdData?.subscriptionStatus === 'premium'

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/dev/toggle-premium', { method: 'POST' })
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-household'] })
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      queryClient.invalidateQueries({ queryKey: ['rewards-child'] })
    },
  })

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        fontFamily: 'monospace',
      }}
    >
      {open && (
        <div
          style={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: 12,
            padding: '12px 16px',
            minWidth: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Dev Tools
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#F9FAFB', fontWeight: 600 }}>
              Premium
            </span>
            <button
              type="button"
              onClick={() => toggleMutation.mutate()}
              disabled={isLoading || toggleMutation.isPending}
              data-testid="premium-toggle"
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                backgroundColor: isPremium ? '#A855F7' : '#374151',
                cursor: isLoading || toggleMutation.isPending ? 'default' : 'pointer',
                position: 'relative',
                transition: 'background-color 0.15s',
                opacity: isLoading || toggleMutation.isPending ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: isPremium ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.15s',
                }}
              />
            </button>
          </div>

          <p style={{ fontSize: 11, color: isPremium ? '#A855F7' : '#6B7280', fontWeight: 600 }}>
            {isLoading ? '...' : isPremium ? 'Premium active' : 'Free tier'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          height: 32,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 8,
          border: '1px solid #374151',
          backgroundColor: '#111827',
          color: '#9CA3AF',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        DEV
      </button>
    </div>
  )
}
