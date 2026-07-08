'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Users,
  CheckSquare,
  ShoppingCart,
  DollarSign,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import RoostLogo from '@/components/shared/RoostLogo'

type Step = 1 | '2a' | '2b' | 3 | 'pending'

const WELCOME_FEATURES = [
  { icon: CheckSquare, title: 'Chores', desc: 'Track who does what and keep score' },
  { icon: ShoppingCart, title: 'Grocery', desc: 'One shared list, no duplicate buys' },
  { icon: DollarSign, title: 'Expenses', desc: 'Split bills and settle up fairly' },
  { icon: CalendarDays, title: 'Calendar', desc: 'Household events everyone can see' },
]

/** Three slab pills that fill in as the user advances. Red family on the light surface. */
function StepPills({ step }: { step: Step }) {
  const stepNum = step === 1 ? 1 : step === '2a' || step === '2b' ? 2 : 3

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 26 }}>
      {[1, 2, 3].map(d => {
        const done = d < stepNum
        const active = d === stepNum
        return (
          <div
            key={d}
            style={{
              width: active ? 40 : 28,
              height: 6,
              borderRadius: 3,
              backgroundColor: done ? '#C93B3B' : active ? '#EF4444' : '#F5C5C5',
              transition: 'all 0.25s ease',
            }}
          />
        )
      })}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 40,
        padding: '0 4px',
        background: 'none',
        border: 'none',
        color: '#B91C1C',
        fontFamily: 'var(--font-nunito)',
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        marginBottom: 12,
      }}
    >
      <ChevronLeft size={16} strokeWidth={2.75} />
      Back
    </button>
  )
}

function ChoiceCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof Home
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ y: 2 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        minHeight: 88,
        padding: '18px 18px',
        backgroundColor: '#ffffff',
        border: '1.5px solid #F3D2D2',
        borderBottom: '4px solid #EF4444',
        borderRadius: 18,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: 'rgba(239,68,68,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} color="#EF4444" strokeWidth={2.25} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 800, fontSize: 17, color: '#1A0505', margin: 0 }}>{title}</p>
        <p style={{ fontWeight: 600, fontSize: 13.5, color: '#7A3F3F', margin: '3px 0 0', lineHeight: 1.35 }}>
          {desc}
        </p>
      </div>
      <ChevronRight size={20} color="#C99B9B" strokeWidth={2.5} style={{ flexShrink: 0 }} />
    </motion.button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [householdResult, setHouseholdResult] = useState<{ name: string } | null>(null)
  const [pendingHouseholdName, setPendingHouseholdName] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for approval when in pending state
  useEffect(() => {
    if (step !== 'pending') {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    async function checkStatus() {
      const res = await fetch('/api/household/join-requests/status')
      if (!res.ok) return
      const data = await res.json()

      if (data.status === 'approved') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        await fetch('/api/auth/get-session?disableCookieCache=true')
        router.push('/today')
      } else if (data.status === 'not_found') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        toast.error("Your request wasn't approved. You can try a different household.")
        setStep(1)
        setInviteCode('')
        setError('')
      }
    }

    checkStatus()
    pollingRef.current = setInterval(checkStatus, 10_000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [step, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create household')
      } else {
        setHouseholdResult({ name: data.name })
        await fetch('/api/auth/get-session?disableCookieCache=true')
        setStep(3)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to join household')
      } else if (data.status === 'pending') {
        setPendingHouseholdName(data.householdName)
        setStep('pending')
      } else {
        setHouseholdResult({ name: data.name })
        await fetch('/api/auth/get-session?disableCookieCache=true')
        setStep(3)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 54,
    padding: '14px 16px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #F5C5C5',
    borderBottom: '3px solid #DBADB0',
    borderRadius: 12,
    fontFamily: 'var(--font-nunito)',
    fontWeight: 700,
    fontSize: 16,
    color: '#374151',
    outline: 'none',
    display: 'block',
    boxSizing: 'border-box',
  }

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 54,
    padding: '15px 16px',
    backgroundColor: '#B91C1C',
    color: '#ffffff',
    border: 'none',
    borderBottom: '3px solid #991B1B',
    borderRadius: 14,
    fontFamily: 'var(--font-nunito)',
    fontWeight: 800,
    fontSize: 15,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.75 : 1,
    display: 'block',
  }

  const eyebrowStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: '#EF4444',
    margin: '0 0 8px',
  }

  const headingStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 29,
    color: '#1A0505',
    letterSpacing: '-0.5px',
    margin: '0 0 6px',
    lineHeight: 1.15,
  }

  const subStyle: React.CSSProperties = {
    color: '#7A3F3F',
    fontWeight: 600,
    fontSize: 15,
    margin: '0 0 22px',
    lineHeight: 1.45,
  }

  const errorStyle: React.CSSProperties = {
    color: '#DC2626',
    fontWeight: 700,
    fontSize: 13.5,
    margin: '-8px 0 14px',
  }

  const slideProps = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.18 },
    style: { width: '100%' } as React.CSSProperties,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: '#FFF5F5' }}>
      {/* Welcome panel (desktop only) */}
      <div
        className="hidden md:flex"
        style={{
          width: '44%',
          maxWidth: 620,
          backgroundColor: '#B91C1C',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '48px clamp(36px, 4vw, 72px)',
          gap: 'clamp(28px, 3vw, 44px)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <RoostLogo size="xl" variant="onDark" wordmark={false} />
          <span
            style={{
              color: '#ffffff',
              fontWeight: 900,
              fontSize: 32,
              letterSpacing: '-0.5px',
              lineHeight: 1,
              marginTop: 14,
            }}
          >
            Roost
          </span>
          <p
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 700,
              fontSize: 'clamp(14px, 1.2vw, 17px)',
              margin: '12px 0 0',
            }}
          >
            One App, No Excuses.
          </p>
        </div>

        <div style={{ maxWidth: 380 }}>
          <h2
            style={{
              color: '#ffffff',
              fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 38px)',
              letterSpacing: '-0.6px',
              lineHeight: 1.1,
              margin: '0 0 12px',
            }}
          >
            Welcome home.
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontWeight: 600,
              fontSize: 'clamp(14px, 1.15vw, 16px)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Let&apos;s get your household set up. It only takes a minute, then everyone is on the same page.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 'clamp(14px, 1.6vw, 20px)',
            maxWidth: 340,
          }}
        >
          {WELCOME_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left' }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Icon size={18} color="#fff" strokeWidth={2.25} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0', lineHeight: 1.4 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile brand hero (mobile only) */}
        <div
          className="flex md:hidden"
          style={{
            backgroundColor: '#B91C1C',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '32px 24px 28px',
          }}
        >
          <RoostLogo size="lg" variant="onDark" wordmarkColor="#fff" />
          <p style={{ color: 'rgba(255,255,255,0.78)', fontWeight: 700, fontSize: 13.5, margin: 0 }}>
            One App, No Excuses.
          </p>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(28px, 5vw, 56px) 24px',
          }}
        >
          <div style={{ width: '100%', maxWidth: 460 }}>
            <StepPills step={step} />

            <AnimatePresence mode="wait">
              {/* Step 1: Choose path */}
              {step === 1 && (
                <motion.div key="step-1" {...slideProps}>
                  <p style={eyebrowStyle}>Get started</p>
                  <h1 style={headingStyle}>Welcome to Roost</h1>
                  <p style={subStyle}>Create a household or join one that already exists.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <ChoiceCard
                      icon={Home}
                      title="Create a Household"
                      desc="Start fresh and invite everyone else to join."
                      onClick={() => {
                        setError('')
                        setStep('2a')
                      }}
                    />
                    <ChoiceCard
                      icon={Users}
                      title="Join a Household"
                      desc="Enter the code from your housemate."
                      onClick={() => {
                        setError('')
                        setStep('2b')
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2a: Create */}
              {step === '2a' && (
                <motion.div key="step-2a" {...slideProps}>
                  <BackButton
                    onClick={() => {
                      setError('')
                      setStep(1)
                    }}
                  />
                  <h1 style={headingStyle}>Name your household</h1>
                  <p style={subStyle}>You can always rename it later in settings.</p>
                  <form onSubmit={handleCreate}>
                    <input
                      placeholder="e.g. The Johnson House"
                      value={householdName}
                      onChange={e => setHouseholdName(e.target.value)}
                      required
                      style={{ ...inputStyle, marginBottom: error ? 12 : 18 }}
                    />
                    {error && <p style={errorStyle}>{error}</p>}
                    <button type="submit" disabled={loading} style={primaryButtonStyle}>
                      {loading ? 'Creating...' : 'Create Household'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step 2b: Join */}
              {step === '2b' && (
                <motion.div key="step-2b" {...slideProps}>
                  <BackButton
                    onClick={() => {
                      setError('')
                      setStep(1)
                    }}
                  />
                  <h1 style={headingStyle}>Join a household</h1>
                  <p style={subStyle}>Ask your housemate for their code from Settings.</p>
                  <form onSubmit={handleJoin}>
                    <input
                      placeholder="Household code"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      required
                      style={{
                        ...inputStyle,
                        letterSpacing: '0.3em',
                        fontFamily: 'monospace',
                        textAlign: 'center',
                        fontSize: 20,
                        fontWeight: 800,
                        marginBottom: error ? 12 : 18,
                      }}
                    />
                    {error && <p style={errorStyle}>{error}</p>}
                    <button type="submit" disabled={loading} style={primaryButtonStyle}>
                      {loading ? 'Joining...' : 'Join Household'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step pending: Waiting room */}
              {step === 'pending' && (
                <motion.div key="step-pending" {...slideProps}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 18px',
                      }}
                    >
                      <Clock size={28} color="#EF4444" strokeWidth={2.25} />
                    </div>
                    <p style={{ ...eyebrowStyle, textAlign: 'center' }}>Waiting for approval</p>
                    <h1 style={{ ...headingStyle, textAlign: 'center' }}>{pendingHouseholdName}</h1>
                    <p style={{ ...subStyle, textAlign: 'center', margin: '0 0 20px' }}>
                      Your request has been sent to the admin. Hang tight, this screen updates on its own.
                    </p>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 9,
                        color: '#9B6060',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          border: '2px solid #F5C5C5',
                          borderTop: '2px solid #EF4444',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.7s linear infinite',
                        }}
                      />
                      Checking for approval...
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 3 && (
                <motion.div key="step-3" {...slideProps}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(34,197,94,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 18px',
                      }}
                    >
                      <Check size={30} color="#159143" strokeWidth={3} />
                    </div>
                    <p style={{ ...eyebrowStyle, textAlign: 'center', color: '#159143' }}>You&apos;re in</p>
                    <h1 style={{ ...headingStyle, textAlign: 'center' }}>{householdResult?.name}</h1>
                    <p style={{ ...subStyle, textAlign: 'center' }}>
                      Your household is ready. Time to get everyone sorted.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/today')}
                      style={primaryButtonStyle}
                    >
                      Go to Roost
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
