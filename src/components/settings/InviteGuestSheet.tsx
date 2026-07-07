'use client'

import { useState } from 'react'
import { Check, Copy, Link2, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { usePlatformCapabilities } from '@/lib/hooks/usePlatformCapabilities'
import { shareOrCopy } from '@/lib/utils/share'

interface InviteGuestSheetProps {
  open: boolean
  onClose: () => void
}

const COLOR = '#F59E0B'
const COLOR_DARK = '#C87D00'

const PRESETS: Array<{ label: string; days: number }> = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '30 days', days: 30 },
]

export default function InviteGuestSheet({ open, onClose }: InviteGuestSheetProps) {
  const { hasNativeShare } = usePlatformCapabilities()
  const [email, setEmail] = useState('')
  const [days, setDays] = useState(7)
  const [generating, setGenerating] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setEmail('')
    setDays(7)
    setGenerating(false)
    setLink(null)
    setExpiresAt(null)
    setCopied(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined, expiresInDays: days }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not create invite link')
      }
      setLink(data.url)
      setExpiresAt(data.expiresAt ?? null)
    } catch (err) {
      toast.error('Could not create invite link', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleShare() {
    if (!link) return
    const result = await shareOrCopy(
      { title: 'Join my household on Roost', text: `You are invited as a guest on Roost. Open this link to join: ${link}`, url: link },
      link,
    )
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied')
    } else if (result === 'failed') {
      toast.error('Could not share link', { description: 'Try copying it manually.' })
    }
  }

  const expiryLabel = (() => {
    if (!expiresAt) return null
    const d = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    if (d <= 0) return 'Expires today'
    return `Guest access expires in ${d} ${d === 1 ? 'day' : 'days'}`
  })()

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) handleClose() }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Invite a guest
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
          Guests get temporary, limited access that ends automatically. Good for visiting family or a short stay.
        </p>

        {!link ? (
          <>
            {/* Email (optional) */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151', marginBottom: 6 }}>
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
              style={{
                width: '100%',
                height: 48,
                padding: '0 14px',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--roost-text-primary)',
                backgroundColor: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: '3px solid var(--roost-border-bottom)',
                borderRadius: 12,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 18,
              }}
            />

            {/* Expiry presets */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151', marginBottom: 8 }}>
              Access expires after
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              {PRESETS.map((p) => {
                const active = days === p.days
                return (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setDays(p.days)}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: active ? COLOR : 'var(--roost-surface)',
                      color: active ? '#fff' : 'var(--roost-text-secondary)',
                      border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
                      borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 12,
                background: COLOR,
                border: 'none',
                borderBottom: `3px solid ${COLOR_DARK}`,
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {generating ? 'Creating link...' : 'Create Invite Link'}
            </button>
          </>
        ) : (
          <>
            {/* Generated link */}
            <div
              style={{
                background: 'var(--roost-bg)',
                border: '1.5px solid var(--roost-border)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Guest link
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-primary)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {link}
              </p>
            </div>

            {expiryLabel && (
              <p style={{ fontSize: 12, fontWeight: 700, color: COLOR_DARK, marginBottom: 16 }}>
                {expiryLabel}. The link itself works for up to 7 days.
              </p>
            )}

            <button
              type="button"
              onClick={handleShare}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 12,
                background: copied ? '#22C55E' : COLOR,
                border: 'none',
                borderBottom: `3px solid ${copied ? '#15803D' : COLOR_DARK}`,
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              {copied ? <Check size={16} /> : hasNativeShare ? <Share2 size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : hasNativeShare ? 'Share Link' : 'Copy Link'}
            </button>

            <button
              type="button"
              onClick={() => { setLink(null); setExpiresAt(null); setCopied(false) }}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                background: 'none',
                border: 'none',
                color: 'var(--roost-text-muted)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Create Another Link
            </button>
          </>
        )}
      </div>
    </DraggableSheet>
  )
}
