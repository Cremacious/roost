'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#3B82F6'
const COLOR_DARK = '#1A5CB5'

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#374151', marginBottom: 6,
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', height: 48, fontSize: 16, fontWeight: 600, padding: '0 14px',
  border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
  borderRadius: 12, background: 'var(--roost-surface)', color: 'var(--roost-text-primary)', outline: 'none',
}

export function UpgradeAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const weak = password.length > 0 && (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
  const mismatch = confirm.length > 0 && confirm !== password

  async function handleSubmit() {
    if (!email.trim()) { toast.error('Enter an email', { description: 'You will use it to sign in.' }); return }
    if (weak) { toast.error('Password too weak', { description: 'Use 8+ characters with an uppercase letter and a number.' }); return }
    if (password !== confirm) { toast.error('Passwords do not match', { description: 'Re-enter the same password.' }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/user/upgrade-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not upgrade your account')
      toast.success('You are all set', { description: 'From now on, sign in with your email and password.' })
      qc.invalidateQueries({ queryKey: ['household'] })
      qc.invalidateQueries({ queryKey: ['user-profile'] })
      onClose()
    } catch (err) {
      toast.error('Upgrade failed', { description: err instanceof Error ? err.message : 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Upgrade to a full account
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', lineHeight: 1.5 }}>
          Set an email and password to become a full member. You keep everything you have already done.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Email</label>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" style={INPUT_STYLE} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters"
              style={{ ...INPUT_STYLE, paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--roost-text-muted)', display: 'flex', padding: 4 }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {weak && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Use 8+ characters with an uppercase letter and a number.</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={LABEL_STYLE}>Confirm password</label>
          <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" style={INPUT_STYLE} />
          {mismatch && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Passwords do not match.</p>}
        </div>

        <motion.button whileTap={{ y: 1 }} type="button" onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', borderBottom: `4px solid ${COLOR_DARK}`,
            background: COLOR, color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Setting up...' : 'Create my account'}
        </motion.button>
      </div>
    </DraggableSheet>
  )
}
