'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { LogOut, Copy, Check, User, Home } from 'lucide-react'
import { useSession, signOut } from '@/lib/auth/client'
import { Skeleton } from '@/components/ui/Skeleton'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: 'var(--roost-text-muted)', margin: 0, textTransform: 'uppercase' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '4px solid var(--roost-border-bottom)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid var(--roost-border)',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--roost-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--roost-text-primary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function InviteCodeRow({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        gap: 12,
      }}
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--roost-text-secondary)', margin: 0 }}>Invite code</p>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: 'var(--roost-text-primary)', margin: '4px 0 0', letterSpacing: '0.15em' }}>{code}</p>
      </div>
      <button
        onClick={handleCopy}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: copied ? '#22C55E' : '#3B82F6',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.15s',
        }}
        aria-label="Copy invite code"
      >
        {copied ? <Check size={16} color="#fff" /> : <Copy size={16} color="#fff" />}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const name = session?.user?.name ?? ''
  const email = session?.user?.email ?? ''

  const { data: householdData, isLoading } = useQuery({
    queryKey: ['household-me'],
    queryFn: async () => {
      const res = await fetch('/api/household/me')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 60_000,
  })

  const household = householdData?.household
  const role = householdData?.role ?? 'member'

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ padding: '20px 16px 40px', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <h1 style={{ margin: 0, fontWeight: 900, fontSize: 24, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>
        Settings
      </h1>

      {/* Profile */}
      <Section title="Profile">
        <Card>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--roost-border)' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {name ? (
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>
                  {name.split(' ').map((p: string) => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()}
                </span>
              ) : (
                <User size={20} color="#fff" />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name || 'Your name'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </p>
            </div>
          </div>
          <Row label="Role" value={role.charAt(0).toUpperCase() + role.slice(1)} last />
        </Card>
      </Section>

      {/* Household */}
      <Section title="Household">
        <Card>
          {isLoading ? (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton style={{ height: 16, width: '60%' }} />
              <Skeleton style={{ height: 14, width: '40%' }} />
            </div>
          ) : household ? (
            <>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--roost-border)' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: 'rgba(59,130,246,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Home size={16} color="#3B82F6" />
                </div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)' }}>
                  {household.name}
                </p>
              </div>
              <InviteCodeRow code={household.inviteCode} />
            </>
          ) : (
            <div style={{ padding: '16px' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>No household found.</p>
            </div>
          )}
        </Card>
      </Section>

      {/* Account */}
      <Section title="Account">
        <Card>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px',
              backgroundColor: 'transparent',
              border: 'none',
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#EF4444' }}>Sign out</span>
          </button>
        </Card>
      </Section>
    </motion.div>
  )
}
