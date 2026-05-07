'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, LogOut, ChevronRight, User } from 'lucide-react'
import { useSession, signOut } from '@/lib/auth/client'

export default function MorePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const name = session?.user?.name ?? ''
  const email = session?.user?.email ?? ''
  const initials = name
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>
      {/* User block */}
      <div
        style={{
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '4px solid var(--roost-border-bottom)',
          borderRadius: 16,
          padding: '16px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#EF4444',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>{initials || <User size={20} color="#fff" />}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 16, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name || 'You'}
          </p>
          <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 13, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </p>
        </div>
      </div>

      {/* Nav links */}
      <div
        style={{
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '4px solid var(--roost-border-bottom)',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px',
            textDecoration: 'none',
            borderBottom: '1px solid var(--roost-border)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(107,114,128,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Settings size={18} color="var(--roost-text-secondary)" />
          </div>
          <span style={{ flex: 1, color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 15 }}>
            Settings
          </span>
          <ChevronRight size={16} color="var(--roost-text-muted)" />
        </Link>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px',
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '4px solid rgba(239,68,68,0.3)',
          borderRadius: 16,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'rgba(239,68,68,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LogOut size={18} color="#EF4444" />
        </div>
        <span style={{ flex: 1, color: '#EF4444', fontWeight: 700, fontSize: 15 }}>
          Sign out
        </span>
      </button>
    </div>
  )
}
