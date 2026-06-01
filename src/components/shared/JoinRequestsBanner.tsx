'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { UserCheck, X } from 'lucide-react'
import { useHousehold } from '@/lib/hooks/useHousehold'

export default function JoinRequestsBanner() {
  const { role } = useHousehold()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = 'roost-join-requests-banner-dismissed'
    if (sessionStorage.getItem(key)) setDismissed(true)
  }, [])

  const { data } = useQuery({
    queryKey: ['join-requests'],
    queryFn: async () => {
      const res = await fetch('/api/household/join-requests')
      if (!res.ok) return { requests: [] }
      return res.json() as Promise<{ requests: { id: string }[] }>
    },
    enabled: role === 'admin',
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const count = data?.requests?.length ?? 0

  if (role !== 'admin' || dismissed || count === 0) return null

  function handleDismiss() {
    sessionStorage.setItem('roost-join-requests-banner-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 16px',
        backgroundColor: '#1D4ED8',
        color: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserCheck size={16} strokeWidth={2} />
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          {count === 1
            ? '1 member request waiting for your approval'
            : `${count} member requests waiting for your approval`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => {
            router.push('/settings#section-household')
            handleDismiss()
          }}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#ffffff',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Review
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ffffff' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
