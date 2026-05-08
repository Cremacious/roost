'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

type Step = 1 | '2a' | '2b' | 3

function DotProgress({ step }: { step: Step }) {
  const stepNum = step === 1 ? 1 : step === '2a' || step === '2b' ? 2 : 3

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 7,
        padding: '14px 16px 10px',
      }}
    >
      {[1, 2, 3].map(d => {
        const done = d < stepNum
        const active = d === stepNum
        const inactive = !done && !active

        if (done) {
          return (
            <div
              key={d}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              <Check size={8} color="#EF4444" strokeWidth={3.5} />
            </div>
          )
        }

        if (active) {
          return (
            <div
              key={d}
              style={{
                width: 20,
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.95)',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            />
          )
        }

        // inactive
        return (
          <div
            key={d}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: inactive ? 'rgba(255,255,255,0.3)' : 'transparent',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          />
        )
      })}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [householdResult, setHouseholdResult] = useState<{ name: string } | null>(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    minHeight: 48,
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1.5px solid rgba(255,255,255,0.5)',
    borderBottom: '3px solid rgba(0,0,0,0.12)',
    borderRadius: 10,
    fontFamily: 'var(--font-nunito)',
    fontWeight: 700,
    fontSize: 16, // 16px prevents iOS Safari auto-zoom
    color: '#374151',
    outline: 'none',
    display: 'block',
    boxSizing: 'border-box',
  }

  const ctaButtonStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '13px 16px',
    backgroundColor: '#ffffff',
    color: '#EF4444',
    border: 'none',
    borderBottom: '3px solid #E5E7EB',
    borderRadius: 11,
    fontFamily: 'var(--font-nunito)',
    fontWeight: 800,
    fontSize: 14,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'block',
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#ffffff',
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
          backgroundColor: '#EF4444',
          borderRadius: 18,
          borderBottom: '5px solid #C93B3B',
          overflow: 'hidden',
        }}
      >
        <DotProgress step={step} />

        <div style={{ padding: '2px 16px 22px' }}>
          {/* Step 1: Choose path */}
          {step === 1 && (
            <>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#ffffff',
                  marginBottom: 4,
                  lineHeight: 1.2,
                }}
              >
                Your household
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 18,
                  lineHeight: 1.4,
                }}
              >
                Create new or join one that already exists
              </p>
              <button
                onClick={() => { setError(''); setStep('2a') }}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderBottom: '3px solid #E5E7EB',
                  borderRadius: 11,
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                <p style={{ fontWeight: 800, fontSize: 14, color: '#111827', margin: 0 }}>
                  Create a household
                </p>
                <p style={{ fontWeight: 700, fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                  Start fresh and invite others to join
                </p>
              </button>
              <button
                onClick={() => { setError(''); setStep('2b') }}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderBottom: '3px solid #E5E7EB',
                  borderRadius: 11,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                <p style={{ fontWeight: 800, fontSize: 14, color: '#111827', margin: 0 }}>
                  Join a household
                </p>
                <p style={{ fontWeight: 700, fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                  Enter the code from your housemate
                </p>
              </button>
            </>
          )}

          {/* Step 2a: Create */}
          {step === '2a' && (
            <>
              <button
                type="button"
                onClick={() => { setError(''); setStep(1) }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  marginBottom: 10,
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'var(--font-nunito)',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                ← Back
              </button>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#ffffff',
                  marginBottom: 4,
                  lineHeight: 1.2,
                }}
              >
                Name your household
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 14,
                  lineHeight: 1.4,
                }}
              >
                You can always rename it later in settings
              </p>
              <form onSubmit={handleCreate}>
                <input
                  placeholder="e.g. The Johnson House"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  required
                  style={{ ...inputStyle, marginBottom: error ? 8 : 12 }}
                />
                {error && (
                  <p style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading} style={ctaButtonStyle}>
                  {loading ? 'Creating...' : 'Create household'}
                </button>
              </form>
            </>
          )}

          {/* Step 2b: Join */}
          {step === '2b' && (
            <>
              <button
                type="button"
                onClick={() => { setError(''); setStep(1) }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  marginBottom: 10,
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'var(--font-nunito)',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                ← Back
              </button>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#ffffff',
                  marginBottom: 4,
                  lineHeight: 1.2,
                }}
              >
                Join a household
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 14,
                  lineHeight: 1.4,
                }}
              >
                Ask your housemate to share their code from Settings
              </p>
              <form onSubmit={handleJoin}>
                <input
                  placeholder="6-letter code from your housemate"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  style={{
                    ...inputStyle,
                    letterSpacing: '0.25em',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    marginBottom: error ? 8 : 12,
                  }}
                />
                {error && (
                  <p style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading} style={ctaButtonStyle}>
                  {loading ? 'Joining...' : 'Join household'}
                </button>
              </form>
            </>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Check size={20} color="#ffffff" strokeWidth={3} />
              </div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)',
                  marginBottom: 4,
                }}
              >
                You&apos;re in
              </p>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 24,
                  color: '#ffffff',
                  marginBottom: 20,
                  lineHeight: 1.2,
                }}
              >
                {householdResult?.name}
              </h1>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  width: '100%',
                  minHeight: 48,
                  padding: '13px 16px',
                  backgroundColor: '#ffffff',
                  color: '#EF4444',
                  border: 'none',
                  borderBottom: '3px solid #E5E7EB',
                  borderRadius: 11,
                  fontFamily: 'var(--font-nunito)',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
