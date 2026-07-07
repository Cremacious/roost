'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CalendarDays,
  Check,
  Clock,
  DollarSign,
  Loader2,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react'
import { useSession } from '@/lib/auth/client'
import RoostLogo from '@/components/shared/RoostLogo'

type InviteState =
  | { status: 'loading' }
  | { status: 'valid'; householdName: string; expiresAt: string | null }
  | { status: 'not_found' }
  | { status: 'expired' }
  | { status: 'used' }
  | { status: 'error' }

const BG = '#FFF5F5'
const BRAND = '#B91C1C'
const BRAND_DARK = '#991B1B'
const AMBER_BG = '#FEF3C7'
const AMBER_TEXT = '#92400E'

const GUEST_CAPABILITIES: Array<{ icon: React.ReactNode; text: string }> = [
  { icon: <DollarSign size={14} />, text: 'View and add household expenses' },
  { icon: <ShoppingCart size={14} />, text: 'Add items to grocery lists' },
  { icon: <CalendarDays size={14} />, text: 'Add events to the calendar' },
  { icon: <UtensilsCrossed size={14} />, text: 'Suggest meals for the week' },
  { icon: <Clock size={14} />, text: 'Access ends automatically when the invite expires' },
]

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export default function InviteLandingPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ''
  const router = useRouter()
  const { data: session, isPending: sessionLoading } = useSession()
  const [state, setState] = useState<InviteState>({ status: 'loading' })
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/invite/${token}`)
        const data = await res.json().catch(() => ({}))
        if (!active) return
        if (res.ok && data.status === 'valid') {
          setState({ status: 'valid', householdName: data.householdName, expiresAt: data.expiresAt ?? null })
        } else if (data.status === 'expired') {
          setState({ status: 'expired' })
        } else if (data.status === 'used') {
          setState({ status: 'used' })
        } else if (data.status === 'not_found' || res.status === 404) {
          setState({ status: 'not_found' })
        } else {
          setState({ status: 'error' })
        }
      } catch {
        if (active) setState({ status: 'error' })
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  async function handleJoin() {
    setJoining(true)
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.code === 'ALREADY_MEMBER') {
          toast.success('You are already in this household')
          router.push('/today')
          return
        }
        throw new Error(data.error ?? 'Could not join')
      }
      toast.success(`Welcome to ${data.householdName ?? 'the household'}`)
      router.push('/today')
    } catch (err) {
      toast.error('Could not join household', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setJoining(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <RoostLogo size="lg" wordmark={true} />
        </div>

        <div
          style={{
            background: '#fff',
            border: '1.5px solid #F5C5C5',
            borderBottom: '4px solid #DBADB0',
            borderRadius: 18,
            padding: '24px 22px',
          }}
        >
          {state.status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
              <Loader2 size={26} color={BRAND} className="animate-spin" />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#7A3F3F' }}>Checking your invite...</p>
            </div>
          )}

          {state.status === 'valid' && (
            <>
              {/* Guest badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: AMBER_BG,
                  color: AMBER_TEXT,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: 999,
                  marginBottom: 14,
                }}
              >
                <Clock size={12} />
                Guest invite
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A0505', letterSpacing: '-0.4px', margin: '0 0 6px' }}>
                Join {state.householdName}
              </h1>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#7A3F3F', margin: '0 0 18px', lineHeight: 1.5 }}>
                {(() => {
                  const d = daysUntil(state.expiresAt)
                  if (d === null) return 'You have been invited as a temporary guest.'
                  if (d <= 0) return 'You have been invited as a temporary guest.'
                  return `You have been invited as a guest for ${d} ${d === 1 ? 'day' : 'days'}.`
                })()}
              </p>

              {/* Capability list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                {GUEST_CAPABILITIES.map((cap, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: '#FFF5F5',
                        color: BRAND,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {cap.icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#4A2C2C', lineHeight: 1.35 }}>{cap.text}</span>
                  </div>
                ))}
              </div>

              {/* Action */}
              {sessionLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <Loader2 size={20} color={BRAND} className="animate-spin" />
                </div>
              ) : session ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    background: BRAND,
                    border: 'none',
                    borderBottom: `3px solid ${BRAND_DARK}`,
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: joining ? 'not-allowed' : 'pointer',
                    opacity: joining ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {joining ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {joining ? 'Joining...' : 'Join as Guest'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link
                    href={`/signup?callbackUrl=/invite/${token}`}
                    style={{
                      width: '100%',
                      height: 52,
                      borderRadius: 14,
                      background: BRAND,
                      borderBottom: `3px solid ${BRAND_DARK}`,
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    Sign Up to Join
                  </Link>
                  <Link
                    href={`/login?callbackUrl=/invite/${token}`}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 14,
                      background: '#fff',
                      border: '1.5px solid #F5C5C5',
                      color: BRAND,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    I already have an account
                  </Link>
                </div>
              )}
            </>
          )}

          {(state.status === 'not_found' || state.status === 'expired' || state.status === 'used' || state.status === 'error') && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A0505', letterSpacing: '-0.3px', margin: '0 0 8px' }}>
                {state.status === 'expired' && 'This invite has expired'}
                {state.status === 'used' && 'This invite was already used'}
                {state.status === 'not_found' && 'Invite not found'}
                {state.status === 'error' && 'Something went wrong'}
              </h1>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#7A3F3F', margin: '0 0 20px', lineHeight: 1.5 }}>
                {state.status === 'expired' && 'Ask whoever invited you to send a fresh guest link.'}
                {state.status === 'used' && 'Each guest link works once. Ask for a new one if you still need access.'}
                {state.status === 'not_found' && 'This link is not valid. Double check it, or ask for a new invite.'}
                {state.status === 'error' && 'Please check your connection and try again.'}
              </p>
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 46,
                  padding: '0 22px',
                  borderRadius: 14,
                  background: BRAND,
                  borderBottom: `3px solid ${BRAND_DARK}`,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                Go to Roost
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
