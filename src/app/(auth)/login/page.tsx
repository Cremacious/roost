'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckSquare, ShoppingCart, DollarSign, CalendarDays, UtensilsCrossed, Bell } from 'lucide-react'
import RoostLogo from '@/components/shared/RoostLogo'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Invalid email or password')
      } else {
        router.push(callbackUrl)
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
          <p style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 14, marginBottom: 28 }}>
            Sign in to your household
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

            <Button type="submit" loading={loading} color="#EF4444" darkColor="#C93B3B" size="lg">
              Sign in
            </Button>
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
