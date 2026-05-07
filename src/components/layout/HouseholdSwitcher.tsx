'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'

interface HouseholdItem {
  id: string
  name: string
  role: string
  memberCount: number
  isPremium: boolean
  isActive: boolean
}

export function HouseholdSwitcher() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data } = useQuery<{ households: HouseholdItem[] }>({
    queryKey: ['households'],
    queryFn: () => fetch('/api/households').then(r => r.json()),
    staleTime: 30_000,
  })

  const households = data?.households ?? []
  const active = households.find(h => h.isActive)

  async function handleSwitch(householdId: string) {
    if (households.find(h => h.id === householdId)?.isActive) {
      setOpen(false)
      return
    }
    await fetch('/api/household/switch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId }),
    })
    queryClient.clear()
    setOpen(false)
    router.push('/today')
  }

  return (
    <div
      style={{
        padding: '12px 12px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.08em',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        Household
      </div>

      {/* Household name row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left',
          }}
        >
          {active?.name ?? '...'}
        </span>
        {open
          ? <ChevronUp size={14} color="rgba(255,255,255,0.6)" />
          : <ChevronDown size={14} color="rgba(255,255,255,0.6)" />
        }
      </button>

      {/* Inline dropdown */}
      {open && (
        <div
          style={{
            marginTop: 8,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 10,
            padding: 6,
          }}
        >
          {households.map(h => (
            <button
              key={h.id}
              onClick={() => handleSwitch(h.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: h.isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                border: 'none',
                borderRadius: 7,
                padding: '8px 10px',
                marginBottom: 3,
                cursor: h.isActive ? 'default' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: h.isActive ? 800 : 700,
                    color: h.isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {h.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                  {h.role.charAt(0).toUpperCase() + h.role.slice(1)}
                </div>
              </div>
              {h.isActive && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ade80',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}

          {/* Join or create another */}
          <button
            onClick={() => { setOpen(false); router.push('/onboarding') }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              width: '100%',
              background: 'none',
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 7,
              paddingBottom: 3,
              paddingLeft: 10,
              paddingRight: 10,
              cursor: 'pointer',
            }}
          >
            <Plus size={11} color="rgba(255,255,255,0.45)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
              Join or create another
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
