'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import RoostLogo from '@/components/shared/RoostLogo'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function getCookieValue(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : ''
}

function setCookie(name: string, value: string, maxAgeSecs: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSecs}`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

const COOKIE_NAME = 'roost-child-household-code'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildAccount {
  id: string
  name: string
  avatarColor?: string
}

// ─── Step 1: Household code input ─────────────────────────────────────────────

function Step1({
  onFound,
}: {
  onFound: (code: string, children: ChildAccount[]) => void
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(
    async (submittedCode: string) => {
      const upper = submittedCode.trim().toUpperCase()
      if (!upper || upper.length < 6) {
        setError('Please enter your 6-letter household code.')
        return
      }
      setError('')
      setLoading(true)
      try {
        const res = await fetch(`/api/auth/child-login?householdCode=${encodeURIComponent(upper)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? 'Household not found. Check the code and try again.')
          return
        }
        const data = await res.json()
        const children: ChildAccount[] = data.children ?? []
        if (children.length === 0) {
          setError('No child accounts found in that household.')
          return
        }
        setCookie(COOKIE_NAME, upper, 365 * 24 * 60 * 60)
        onFound(upper, children)
      } catch {
        setError('Something went wrong. Try again.')
      } finally {
        setLoading(false)
      }
    },
    [onFound]
  )

  // On mount: check for saved cookie and auto-submit
  useEffect(() => {
    const saved = getCookieValue(COOKIE_NAME)
    if (saved) {
      setCode(saved)
      handleSubmit(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.18 }}
      style={{ width: '100%', maxWidth: 360 }}
    >
      {/* Logo block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <RoostLogo size="lg" variant="onLight" wordmark={false} />
        <p style={{ fontSize: 22, fontWeight: 900, color: '#1A0505', margin: 0 }}>Roost</p>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A0505', marginBottom: 6 }}>
        Who lives here?
      </h1>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#7A3F3F', marginBottom: 24 }}>
        Enter your household code to get started.
      </p>

      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(code) }}
        placeholder="XXXXXX"
        maxLength={8}
        style={{
          display: 'block',
          width: '100%',
          height: 64,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 6,
          textTransform: 'uppercase',
          textAlign: 'center',
          border: '2px solid #F5C5C5',
          borderBottom: '4px solid #DBADB0',
          borderRadius: 14,
          backgroundColor: '#fff',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: 12,
        }}
      />

      {error && (
        <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{error}</p>
      )}

      <button
        onClick={() => handleSubmit(code)}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          height: 56,
          backgroundColor: '#B91C1C',
          border: 'none',
          borderBottom: '4px solid #991B1B',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 800,
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Find My Household'}
      </button>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/login" style={{ fontSize: 12, fontWeight: 700, color: '#9B6060', textDecoration: 'none' }}>
          Back to Sign In
        </Link>
      </p>
    </motion.div>
  )
}

// ─── Step 2: Child name picker ────────────────────────────────────────────────

function Step2({
  code,
  childAccounts,
  onSelect,
  onBack,
}: {
  code: string
  childAccounts: ChildAccount[]
  onSelect: (child: ChildAccount) => void
  onBack: () => void
}) {
  function getInitials(name: string) {
    return name
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
      style={{ width: '100%', maxWidth: 360 }}
    >
      {/* Logo block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <RoostLogo size="lg" variant="onLight" wordmark={false} />
        <p style={{ fontSize: 22, fontWeight: 900, color: '#1A0505', margin: 0 }}>Roost</p>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A0505', marginBottom: 6 }}>
        Who are you?
      </h1>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#7A3F3F', marginBottom: 24 }}>
        Tap your name to sign in.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {childAccounts.map((child, i) => (
          <motion.button
            key={child.id}
            onClick={() => onSelect(child)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.06, 0.2), duration: 0.15 }}
            whileTap={{ y: 2 }}
            style={{
              height: 80,
              borderRadius: 14,
              backgroundColor: '#fff',
              border: '1.5px solid #F5C5C5',
              borderBottom: '3px solid #DBADB0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 800,
              color: '#1A0505',
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: child.avatarColor ?? '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {getInitials(child.name)}
            </div>
            <span>{child.name}</span>
          </motion.button>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <button
          onClick={() => {
            clearCookie(COOKIE_NAME)
            onBack()
          }}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#9B6060',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Wrong house? (code: {code})
        </button>
      </p>
    </motion.div>
  )
}

// ─── Step 3: PIN pad ──────────────────────────────────────────────────────────

function Step3({
  code,
  child,
  onBack,
}: {
  code: string
  child: ChildAccount
  onBack: () => void
}) {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [shake, setShake] = useState(false)

  const submitPin = useCallback(
    async (digits: string) => {
      if (digits.length !== 4) return
      setPinError('')
      setLoading(true)
      try {
        const res = await fetch('/api/auth/child-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ householdCode: code, childId: child.id, pin: digits }),
        })
        if (res.ok) {
          router.replace('/today')
        } else {
          const data = await res.json().catch(() => ({}))
          setShake(true)
          setPinError(data.error ?? 'Wrong PIN. Try again.')
          setPin('')
          setTimeout(() => setShake(false), 400)
        }
      } catch {
        setShake(true)
        setPinError('Something went wrong. Try again.')
        setPin('')
        setTimeout(() => setShake(false), 400)
      } finally {
        setLoading(false)
      }
    },
    [code, child.id, router]
  )

  function pressKey(key: string) {
    if (loading) return
    setPinError('')
    if (key === 'backspace') {
      setPin(p => p.slice(0, -1))
      return
    }
    const next = pin + key
    setPin(next)
    if (next.length === 4) {
      submitPin(next)
    }
  }

  const PAD_KEYS = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '', '0', 'backspace',
  ]

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
      style={{ width: '100%', maxWidth: 360 }}
    >
      {/* Logo block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <RoostLogo size="lg" variant="onLight" wordmark={false} />
        <p style={{ fontSize: 22, fontWeight: 900, color: '#1A0505', margin: 0 }}>Roost</p>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A0505', marginBottom: 24, textAlign: 'center' }}>
        {child.name}&apos;s PIN
      </h1>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: i < pin.length ? '#B91C1C' : '#F5C5C5',
              transition: 'background-color 0.1s',
            }}
          />
        ))}
      </motion.div>

      {/* Error or spinner */}
      <div style={{ minHeight: 24, textAlign: 'center', marginBottom: 20 }}>
        {loading && (
          <Loader2 size={18} color="#EF4444" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
        )}
        {!loading && pinError && (
          <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700, margin: 0 }}>{pinError}</p>
        )}
      </div>

      {/* PIN keypad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
        }}
      >
        {PAD_KEYS.map((key, i) => {
          if (key === '') {
            return <div key={i} />
          }
          return (
            <motion.button
              key={key}
              whileTap={{ y: 1 }}
              onClick={() => pressKey(key)}
              disabled={loading}
              style={{
                height: 64,
                backgroundColor: '#fff',
                border: '1.5px solid #F5C5C5',
                borderBottom: '3px solid #D4CFC9',
                borderRadius: 12,
                fontSize: key === 'backspace' ? 0 : 24,
                fontWeight: 800,
                color: '#1A0505',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {key === 'backspace' ? (
                <ChevronLeft size={22} color="#1A0505" />
              ) : (
                key
              )}
            </motion.button>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <button
          onClick={onBack}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#9B6060',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Back
        </button>
      </p>
    </motion.div>
  )
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function ChildLoginPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [householdCode, setHouseholdCode] = useState('')
  const [children, setChildren] = useState<ChildAccount[]>([])
  const [selectedChild, setSelectedChild] = useState<ChildAccount | null>(null)

  function handleFound(code: string, kids: ChildAccount[]) {
    setHouseholdCode(code)
    setChildren(kids)
    setStep(2)
  }

  function handleSelectChild(child: ChildAccount) {
    setSelectedChild(child)
    setStep(3)
  }

  function handleBackToStep1() {
    setStep(1)
    setHouseholdCode('')
    setChildren([])
    setSelectedChild(null)
  }

  function handleBackToStep2() {
    setStep(2)
    setSelectedChild(null)
  }

  return (
    <>
      {/* Global spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          minHeight: '100dvh',
          backgroundColor: '#FFF5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1 key="step1" onFound={handleFound} />
          )}
          {step === 2 && (
            <Step2
              key="step2"
              code={householdCode}
              childAccounts={children}
              onSelect={handleSelectChild}
              onBack={handleBackToStep1}
            />
          )}
          {step === 3 && selectedChild && (
            <Step3
              key="step3"
              code={householdCode}
              child={selectedChild}
              onBack={handleBackToStep2}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
