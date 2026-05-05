'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
        router.push('/onboarding')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
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
          <div
            style={{
              width: 42,
              height: 42,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: 12,
              marginBottom: 12,
            }}
          />
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 26, letterSpacing: '-0.5px', margin: 0 }}>
            Roost
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13, marginTop: 4 }}>
            Home, sorted.
          </p>
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
            Create your account
          </h1>
          <p style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 14, marginBottom: 28 }}>
            Set up Roost for your household
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>
                NAME
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
                style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }}
              />
            </div>
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
                autoComplete="new-password"
                style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }}
              />
            </div>

            {error && (
              <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>
            )}

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
        </div>
      </div>
    </div>
  )
}
