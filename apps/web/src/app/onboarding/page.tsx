'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type Step = 1 | 2 | '3a' | '3b' | 4

interface Account {
  name: string
  email: string
  password: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [account, setAccount] = useState<Account>({ name: '', email: '', password: '' })
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [householdResult, setHouseholdResult] = useState<{ name: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const dots = [1, 2, 3, 4]
  const currentDot = step === '3a' || step === '3b' ? 3 : step === 4 ? 4 : (step as number)

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (account.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const result = await signUp.email({
        name: account.name,
        email: account.email,
        password: account.password,
      })
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
        // Flush session cache so proxy sees onboardingCompleted=true
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
        {/* Dot progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '20px 24px 0' }}>
          {dots.map(d => (
            <div
              key={d}
              style={{
                height: 8,
                width: d === currentDot ? 24 : 8,
                borderRadius: 4,
                backgroundColor: d < currentDot ? '#C93B3B' : d === currentDot ? '#EF4444' : '#E5E7EB',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ padding: '24px 24px 32px' }}>
          {/* Step 1: Account */}
          {step === 1 && (
            <>
              <h1 style={{ fontWeight: 900, fontSize: 22, color: '#111827', marginBottom: 4 }}>
                Create your account
              </h1>
              <p style={{ color: '#6B7280', fontWeight: 700, fontSize: 13, marginBottom: 24 }}>
                Step 1 of 4
              </p>
              <form onSubmit={handleAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input
                  placeholder="Your name"
                  value={account.name}
                  onChange={e => setAccount(a => ({ ...a, name: e.target.value }))}
                  required
                />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={account.email}
                  onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
                  required
                />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={account.password}
                  onChange={e => setAccount(a => ({ ...a, password: e.target.value }))}
                  required
                />
                {error && <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>}
                <Button type="submit" loading={loading} size="lg">
                  Continue
                </Button>
              </form>
            </>
          )}

          {/* Step 2: Create or join */}
          {step === 2 && (
            <>
              <h1 style={{ fontWeight: 900, fontSize: 22, color: '#111827', marginBottom: 4 }}>
                Your household
              </h1>
              <p style={{ color: '#6B7280', fontWeight: 700, fontSize: 13, marginBottom: 24 }}>
                Step 2 of 4
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => setStep('3a')}
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
                    Start fresh and invite others
                  </p>
                </button>
                <button
                  onClick={() => setStep('3b')}
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
                    Enter a code from your housemate
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
                Step 3 of 4
              </p>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input
                  placeholder="e.g. The Johnson House"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  required
                />
                {error && <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>}
                <Button type="submit" loading={loading} size="lg">
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
                Step 3 of 4
              </p>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input
                  placeholder="Code from your housemate"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  style={{ letterSpacing: '0.2em', fontFamily: 'monospace' }}
                />
                {error && <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>}
                <Button type="submit" loading={loading} size="lg">
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
