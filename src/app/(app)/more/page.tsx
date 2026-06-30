'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Settings, LogOut, ChevronRight } from 'lucide-react'
import { useSession, signOut } from '@/lib/auth/client'
import { applyTheme } from '@/components/providers/ThemeProvider'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'

export default function MorePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: profile } = useQuery<{ user?: { avatar_color?: string; name?: string } }>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const r = await fetch('/api/user/profile')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 5 * 60_000,
  })

  const avatarColor = profile?.user?.avatar_color ?? '#EF4444'

  // Child sessions do not reliably carry the name in useSession(); the app users
  // table (via /api/user/profile) is the dependable source for all roles.
  const name = profile?.user?.name ?? session?.user?.name ?? ''
  const email = session?.user?.email ?? ''
  const initials = name
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleSignOut() {
    applyTheme('default')
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
            backgroundColor: avatarColor,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>{initials || '?'}</span>
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
        onClick={() => setConfirmOpen(true)}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign back in to access your household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', background: 'var(--roost-surface)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--roost-text-secondary)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              style={{ padding: '9px 18px', borderRadius: 10, border: 'none', borderBottom: '3px solid #C93B3B', backgroundColor: '#EF4444', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
