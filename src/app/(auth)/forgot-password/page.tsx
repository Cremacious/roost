'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import RoostLogo from '@/components/shared/RoostLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await requestPasswordReset(email)
      if (result.error) {
        setError(result.error.message ?? 'Something went wrong. Try again.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#FFF5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Mobile logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <RoostLogo size="md" />
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: '#1A0505', fontWeight: 900, fontSize: 26, letterSpacing: '-0.5px', marginBottom: 8 }}>
              Check your email
            </h1>
            <p style={{ color: '#7A3F3F', fontWeight: 600, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              We sent a reset link to <strong>{email}</strong>. It expires in 1 hour.
            </p>
            <p style={{ color: '#7A3F3F', fontWeight: 600, fontSize: 13 }}>
              Did not get it?{' '}
              <button
                onClick={() => setSent(false)}
                style={{ color: '#EF4444', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
              >
                Send again
              </button>
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ color: '#1A0505', fontWeight: 900, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 4 }}>
              Forgot password?
            </h1>
            <p style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 14, marginBottom: 28 }}>
              Enter your email and we will send you a reset link.
            </p>

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

              {error && (
                <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>
              )}

              <Button type="submit" loading={loading} color="#B91C1C" darkColor="#991B1B" size="lg">
                Send reset link
              </Button>
            </form>
          </>
        )}

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#7A3F3F' }}>
          <Link href="/login" style={{ color: '#EF4444' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
