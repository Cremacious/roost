'use client'

import { useState } from 'react'
import { Check, Copy, Link2, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { usePlatformCapabilities } from '@/lib/hooks/usePlatformCapabilities'
import { shareOrCopy } from '@/lib/utils/share'

interface InviteMemberSheetProps {
  open: boolean
  onClose: () => void
  householdName?: string
  householdCode?: string
}

const COLOR = '#EF4444'
const COLOR_DARK = '#C93B3B'

export default function InviteMemberSheet({
  open,
  onClose,
  householdName = '',
  householdCode = '',
}: InviteMemberSheetProps) {
  const { hasNativeShare } = usePlatformCapabilities()
  const [generating, setGenerating] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  function reset() {
    setGenerating(false)
    setLink(null)
    setLinkCopied(false)
    setCodeCopied(false)
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
        body: JSON.stringify({ role: 'member' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not create invite link')
      }
      setLink(data.url)
    } catch (err) {
      toast.error('Could not create invite link', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleShareLink() {
    if (!link) return
    const shareText = householdName
      ? `Join ${householdName} on Roost. Open this link to join: ${link}`
      : `Join my household on Roost. Open this link to join: ${link}`
    const result = await shareOrCopy(
      { title: 'Join my household on Roost', text: shareText, url: link },
      link,
    )
    if (result === 'copied') {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
      toast.success('Link copied')
    } else if (result === 'failed') {
      toast.error('Could not share link', { description: 'Try copying it manually.' })
    }
  }

  async function handleCopyCode() {
    if (!householdCode) return
    const result = await shareOrCopy(
      {
        title: 'Join my household on Roost',
        text: householdName
          ? `Join ${householdName} on Roost. Use household code ${householdCode} when you sign up.`
          : `Join my household on Roost. Use household code ${householdCode} when you sign up.`,
      },
      householdCode,
    )
    if (result === 'copied') {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
      toast.success('Code copied')
    } else if (result === 'failed') {
      toast.error('Could not share code', { description: 'Try copying it manually.' })
    }
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) handleClose() }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Invite a member
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
          {householdName
            ? `Send a link and they join ${householdName} as a full member.`
            : 'Send a link and they join your household as a full member.'}
        </p>

        {!link ? (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 14,
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
            {generating ? 'Creating Link...' : 'Create Invite Link'}
          </button>
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
                Member link
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-primary)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {link}
              </p>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: COLOR_DARK, marginBottom: 16 }}>
              The link works for up to 7 days. Anyone who opens it can join as a member.
            </p>

            <button
              type="button"
              onClick={handleShareLink}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                background: linkCopied ? '#22C55E' : COLOR,
                border: 'none',
                borderBottom: `3px solid ${linkCopied ? '#15803D' : COLOR_DARK}`,
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
              {linkCopied ? <Check size={16} /> : hasNativeShare ? <Share2 size={16} /> : <Copy size={16} />}
              {linkCopied ? 'Copied!' : hasNativeShare ? 'Share Link' : 'Copy Link'}
            </button>

            <button
              type="button"
              onClick={() => { setLink(null); setLinkCopied(false) }}
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

        {/* Code fallback */}
        {householdCode && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)', margin: 0 }}>
              Or share the code:{' '}
              <span style={{ fontFamily: "ui-monospace,'JetBrains Mono',monospace", fontWeight: 800, letterSpacing: '0.12em', color: 'var(--roost-text-primary)' }}>
                {householdCode}
              </span>
            </p>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Copy household code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: '3px solid var(--roost-border-bottom)',
                color: 'var(--roost-text-secondary)',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {codeCopied ? <Check size={13} /> : <Copy size={13} />}
              {codeCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </DraggableSheet>
  )
}
