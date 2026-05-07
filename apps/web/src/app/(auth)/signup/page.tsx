'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckSquare, ShoppingCart, DollarSign, CalendarDays, UtensilsCrossed, Bell } from 'lucide-react'

const FEATURES = [
  { icon: CheckSquare,    title: 'Chores',    desc: 'Track who does what and keep score' },
  { icon: ShoppingCart,   title: 'Grocery',   desc: 'One shared list, no duplicate buys' },
  { icon: DollarSign,     title: 'Expenses',  desc: 'Split bills and settle up fairly' },
  { icon: CalendarDays,   title: 'Calendar',  desc: 'Household events everyone can see' },
  { icon: UtensilsCrossed, title: 'Meals',    desc: 'Plan the week so nobody asks "what\'s for dinner"' },
  { icon: Bell,           title: 'Reminders', desc: 'Nag the right people at the right time' },
]

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
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= score ? colors[score] : '#E5E7EB', transition: 'background-color 0.2s' }} />
        ))}
      </div>
      {password.length > 0 && (
        <p style={{ fontSize: 11, fontWeight: 700, color: colors[score], margin: '3px 0 0' }}>{labels[score]}</p>
      )}
    </div>
  )
}

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
      {/* Red left panel — desktop only */}
      <div
        className="hidden md:flex"
        style={{
          width: '40%',
          backgroundColor: '#EF4444',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '40px 36px',
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, marginBottom: 12 }} />
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 26, letterSpacing: '-0.5px', margin: 0 }}>Roost</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13, marginTop: 4 }}>Home, sorted.</p>
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
        {/* Mobile logo */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="flex md:hidden" style={{ flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#EF4444', borderRadius: 16 }} />
            <p style={{ fontWeight: 900, fontSize: 28, color: '#1A0505', margin: 0 }}>Roost</p>
          </div>

          <h1 style={{ color: '#1A0505', fontWeight: 900, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Create your account
          </h1>
          <p style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 14, marginBottom: 28 }}>
            Set up Roost for your household
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>NAME</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoComplete="name" style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>EMAIL</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: '#7A3F3F', marginBottom: 6 }}>PASSWORD</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required autoComplete="new-password" style={{ border: '1.5px solid #F5C5C5', borderBottom: '3px solid #DBADB0' }} />
              <StrengthBar password={password} />
            </div>

            {error && <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>{error}</p>}

            <Button type="submit" loading={loading} color="#EF4444" darkColor="#C93B3B" size="lg">
              Create account
            </Button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#7A3F3F' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#EF4444' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
