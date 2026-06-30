'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/auth/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import RoostLogo from '@/components/shared/RoostLogo'

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#1A0505', fontWeight: 900, fontSize: 24, marginBottom: 8 }}>Invalid link</h1>
        <p style={{ color: '#7A3F3F', fontWeight: 600, fontSize: 14, marginBottom: 24 }}>
          This reset link is missing or has expired. Request a new one.
        </p>
        <Link href="/forgot-password" style={{ color: '#EF4444', fontWeight: 700, fontSize: 14 }}>
          Request new link
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await resetPassword(token, password)
      if (result.error) {
        setError(result.error.message ?? 'Reset failed. The link may have expired.')
      } else {
        setDone(true)
        setTimeout(() => router.push('/login'), 2500)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#1A0505', fontWeight: 900, fontSize: 26, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Password updated
        </h1>
        <p style={{ color: '#7A3F3F', fontWeight: 600, fontSize: 14, lineHeight: 1.6 }}>
          Your password has been reset. Redirecting you to sign in...
        </p>
      </div>
    )
  }

  return (
    <>
      <h1 style={{ color: '#1A0505', fontWeight: 900, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 4 }}>
        Set new password
      </h1>
      <p style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 14, marginBottom: 28 }}>
        Choose a password you have not used before.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>
            NEW PASSWORD
          </label>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            autoComplete="new-password"
            style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>
            CONFIRM PASSWORD
          </label>
          <Input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Same password again"
            required
            autoComplete="new-password"
            style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }}
          />
        </div>

        {error && (
          <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>
        )}

        <Button type="submit" loading={loading} color="#B91C1C" darkColor="#991B1B" size="lg">
          Update password
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <RoostLogo size="md" />
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#7A3F3F' }}>
          <Link href="/login" style={{ color: '#EF4444' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
