'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

interface HouseholdItem {
  id: string
  name: string
  role: string
  memberCount: number
  isPremium: boolean
  isActive: boolean
}

interface Props {
  open: boolean
  onClose: () => void
}

const COLOR = '#22C55E'

export function HouseholdSwitcherSheet({ open, onClose }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data } = useQuery<{ households: HouseholdItem[] }>({
    queryKey: ['households'],
    queryFn: () => fetch('/api/households').then(r => r.json()),
    staleTime: 30_000,
    enabled: open,
  })

  const households = data?.households ?? []

  async function handleSwitch(householdId: string) {
    const target = households.find(h => h.id === householdId)
    if (target?.isActive) {
      onClose()
      return
    }
    await fetch('/api/household/switch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId }),
    })
    queryClient.clear()
    onClose()
    router.push('/today')
  }

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div style={{ padding: '0 16px 32px' }}>
        <p
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--roost-text-primary)',
            marginBottom: 16,
          }}
        >
          Switch Household
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {households.map(h => (
            <button
              key={h.id}
              onClick={() => handleSwitch(h.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: h.isActive
                  ? `3px solid ${COLOR}`
                  : '3px solid var(--roost-border-bottom)',
                borderRadius: 12,
                padding: '12px 14px',
                cursor: h.isActive ? 'default' : 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--roost-text-primary)',
                  }}
                >
                  {h.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--roost-text-muted)',
                    marginTop: 2,
                  }}
                >
                  {h.role.charAt(0).toUpperCase() + h.role.slice(1)} · {h.memberCount}{' '}
                  member{h.memberCount !== 1 ? 's' : ''}
                </div>
              </div>
              {h.isActive && (
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: COLOR,
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => { onClose(); router.push('/onboarding') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            background: 'none',
            border: 'none',
            padding: '8px 4px',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} color={COLOR} />
          <span style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>
            Join or Create Another Household
          </span>
        </button>
      </div>
    </DraggableSheet>
  )
}
