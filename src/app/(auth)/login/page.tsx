'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, sendVerificationEmail, signInWithGoogle, signInWithApple } from '@/lib/auth/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckSquare, ShoppingCart, DollarSign, CalendarDays, UtensilsCrossed, Bell } from 'lucide-react'
import RoostLogo from '@/components/shared/RoostLogo'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.37-2.16 3.89.03 3.02 2.65 4.03 2.68 4.04l-.07.19zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

const FEATURES = [
  { icon: CheckSquare,     title: 'Chores',    desc: 'Track who does what and keep score' },
  { icon: ShoppingCart,    title: 'Grocery',   desc: 'One shared list, no duplicate buys' },
  { icon: DollarSign,      title: 'Expenses',  desc: 'Split bills and settle up fairly' },
  { icon: CalendarDays,    title: 'Calendar',  desc: 'Household events everyone can see' },
  { icon: UtensilsCrossed, title: 'Meals',     desc: 'Plan the week so nobody asks what\'s for dinner' },
  { icon: Bell,            title: 'Reminders', desc: 'Nag the right people at the right time' },
]

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/today'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  async function handleGoogle() {
    setOauthLoading('google')
    await signInWithGoogle(callbackUrl)
  }

  async function handleApple() {
    setOauthLoading('apple')
    await signInWithApple(callbackUrl)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setUnverifiedEmail(null)
    setLoading(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        // better-auth returns this code when requireEmailVerification is on
        if (
          result.error.code === 'EMAIL_NOT_VERIFIED' ||
          result.error.message?.toLowerCase().includes('verify')
        ) {
          setUnverifiedEmail(email)
        } else {
          setError(result.error.message ?? 'Invalid email or password')
        }
      } else {
        router.push(callbackUrl)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!unverifiedEmail) return
    setResendLoading(true)
    setResendSent(false)
    try {
      await sendVerificationEmail(unverifiedEmail)
      setResendSent(true)
    } catch {
      // silently fail
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Red left panel (desktop only) */}
      <div
        className="hidden md:flex"
        style={{
          width: '40%',
          backgroundColor: '#EF4444',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 36px',
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <RoostLogo size="md" wordmarkColor="#fff" />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13, marginTop: 10 }}>Home, sorted.</p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Icon size={13} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.62)', margin: '2px 0 0', lineHeight: 1.35 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#FFF5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h1 style={{ color: '#1A0505', fontWeight: 900, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Welcome back
          </h1>
          <p style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 14, marginBottom: 24 }}>
            Sign in to your household
          </p>

          {/* OAuth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={!!oauthLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#fff',
                border: '1.5px solid #E5E7EB',
                borderBottom: '3px solid #D1D5DB',
                borderRadius: 12,
                cursor: oauthLoading ? 'not-allowed' : 'pointer',
                opacity: oauthLoading && oauthLoading !== 'google' ? 0.5 : 1,
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 14,
                color: '#1A0505',
              }}
            >
              {oauthLoading === 'google' ? (
                <span style={{ width: 20, height: 20, border: '2px solid #E5E7EB', borderTop: '2px solid #4285F4', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleApple}
              disabled={!!oauthLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#111827',
                border: '1.5px solid #111827',
                borderBottom: '3px solid #000',
                borderRadius: 12,
                cursor: oauthLoading ? 'not-allowed' : 'pointer',
                opacity: oauthLoading && oauthLoading !== 'apple' ? 0.5 : 1,
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 14,
                color: '#fff',
              }}
            >
              {oauthLoading === 'apple' ? (
                <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <AppleIcon />
              )}
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#F5C5C5' }} />
            <span style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 12 }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#F5C5C5' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>
                EMAIL
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>
                PASSWORD
              </label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }}
              />
            </div>

            {error && (
              <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>
            )}

            {unverifiedEmail && (
              <div style={{ backgroundColor: '#FEF3C7', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ color: '#92400E', fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>
                  Email not verified
                </p>
                <p style={{ color: '#92400E', fontWeight: 600, fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>
                  Check your inbox for a verification link, or resend it below.
                </p>
                {resendSent ? (
                  <p style={{ color: '#15803D', fontWeight: 700, fontSize: 12 }}>Sent! Check your inbox.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', padding: 0 }}
                  >
                    {resendLoading ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}

            <Button type="submit" loading={loading} color="#EF4444" darkColor="#C93B3B" size="lg">
              Sign in
            </Button>

            <p style={{ textAlign: 'right', margin: 0 }}>
              <Link href="/forgot-password" style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </p>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#7A3F3F' }}>
            New here?{' '}
            <Link href="/signup" style={{ color: '#EF4444' }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
