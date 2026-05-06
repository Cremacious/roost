'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Check } from 'lucide-react'

type Step = 1 | 2 | '3a' | '3b' | 4

function StrengthBar({ password }: { password: string }) {
  const score = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3

  const colors = ['transparent', '#EF4444', '#F97316', '#EAB308', '#22C55E']
  const labels = ['', 'Too short', 'Weak', 'Fair', 'Strong']

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= score ? colors[score] : '#E5E7EB',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p style={{ fontSize: 11, fontWeight: 700, color: colors[score], margin: '3px 0 0' }}>
          {labels[score]}
        </p>
      )}
    </div>
  )
}

function DotProgress({ step }: { step: Step }) {
  const stepNum = step === 1 ? 1 : step === 2 ? 2 : step === '3a' || step === '3b' ? 3 : 4

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '20px 24px 0' }}>
      {[1, 2, 3, 4].map(d => {
        const done = d < stepNum
        const active = d === stepNum
        return (
          <div
            key={d}
            style={{
              width: active ? 24 : done ? 16 : 8,
              height: active ? 8 : done ? 16 : 8,
              borderRadius: done ? '50%' : 4,
              backgroundColor: done ? '#22C55E' : active ? '#EF4444' : '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            {done && <Check size={9} color="#fff" strokeWidth={3} />}
          </div>
        )
      })}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  // Step 1 state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 3 state
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [householdResult, setHouseholdResult] = useState<{ name: string } | null>(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const result = await signUp.email({ name, email, password })
      if (result.error) {
        setError(result.error.message ?? 'Sign up failed')
      } else {
        setStep(2)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

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
        setStep(4)
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
      } else {
        setHouseholdResult({ name: data.name })
        await fetch('/api/auth/get-session?disableCookieCache=true')
        setStep(4)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.07em',
    color: '#7A3F3F',
    marginBottom: 6,
  }

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #F5C5C5',
    borderBottom: '3px solid #DBADB0',
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#fff',
          borderRadius: 20,
          border: '1.5px solid #E5E7EB',
          borderBottom: '4px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        <DotProgress step={step} />

        <div style={{ padding: '24px 24px 32px' }}>
          {/* Step 1: Account */}
          {step === 1 && (
            <>
              <h1 style={{ fontWeight: 900, fontSize: 22, color: '#111827', marginBottom: 4 }}>
                Create your account
              </h1>
              <p style={{ color: '#6B7280', fontWeight: 700, fontSize: 13, marginBottom: 24 }}>
                Takes about 60 seconds
              </p>
              <form onSubmit={handleAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>NAME</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    autoComplete="name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>EMAIL</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>PASSWORD</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    autoComplete="new-password"
                    style={inputStyle}
                  />
                  <StrengthBar password={password} />
                </div>
                {error && <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>}
                <Button type="submit" loading={loading} color="#EF4444" darkColor="#C93B3B" size="lg">
                  Continue
                </Button>
              </form>
              <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#7A3F3F' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#EF4444' }}>
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* Step 2: Choose path */}
          {step === 2 && (
            <>
              <h1 style={{ fontWeight: 900, fontSize: 22, color: '#111827', marginBottom: 4 }}>
                Your household
              </h1>
              <p style={{ color: '#6B7280', fontWeight: 700, fontSize: 13, marginBottom: 24 }}>
                Create a new household or join one that already exists
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => { setError(''); setStep('3a') }}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    backgroundColor: '#FFF5F5',
                    border: '1.5px solid #FECACA',
                    borderBottom: '4px solid #FCA5A5',
                    borderRadius: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', margin: 0 }}>
                    Create a household
                  </p>
                  <p style={{ fontWeight: 700, fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
                    Start fresh and invite others to join
                  </p>
                </button>
                <button
                  onClick={() => { setError(''); setStep('3b') }}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    backgroundColor: '#F9FAFB',
                    border: '1.5px solid #E5E7EB',
                    borderBottom: '4px solid #D1D5DB',
                    borderRadius: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', margin: 0 }}>
                    Join a household
                  </p>
                  <p style={{ fontWeight: 700, fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
                    Enter the code from your housemate
                  </p>
                </button>
              </div>
            </>
          )}

          {/* Step 3a: Create */}
          {step === '3a' && (
            <>
              <h1 style={{ fontWeight: 900, fontSize: 22, color: '#111827', marginBottom: 4 }}>
                Name your household
              </h1>
              <p style={{ color: '#6B7280', fontWeight: 700, fontSize: 13, marginBottom: 24 }}>
                You can always rename it later in settings
              </p>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input
                  placeholder="e.g. The Johnson House"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  required
                  style={inputStyle}
                />
                {error && <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>}
                <Button type="submit" loading={loading} color="#EF4444" darkColor="#C93B3B" size="lg">
                  Create household
                </Button>
              </form>
            </>
          )}

          {/* Step 3b: Join */}
          {step === '3b' && (
            <>
              <h1 style={{ fontWeight: 900, fontSize: 22, color: '#111827', marginBottom: 4 }}>
                Join a household
              </h1>
              <p style={{ color: '#6B7280', fontWeight: 700, fontSize: 13, marginBottom: 24 }}>
                Ask your housemate to share their invite code from Settings
              </p>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input
                  placeholder="Code from your housemate"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  style={{ ...inputStyle, letterSpacing: '0.2em', fontFamily: 'monospace' }}
                />
                {error && <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>}
                <Button type="submit" loading={loading} color="#EF4444" darkColor="#C93B3B" size="lg">
                  Join household
                </Button>
              </form>
            </>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>
                You&apos;re in
              </p>
              <h1 style={{ fontWeight: 900, fontSize: 24, color: '#111827', marginBottom: 32 }}>
                {householdResult?.name}
              </h1>
              <Button
                onClick={() => router.push('/today')}
                color="#EF4444"
                darkColor="#C93B3B"
                size="lg"
                style={{ width: '100%' }}
              >
                Go to Today
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
