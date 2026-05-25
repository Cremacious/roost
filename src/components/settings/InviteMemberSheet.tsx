'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
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

export default function InviteMemberSheet({
  open,
  onClose,
  householdName = '',
  householdCode = '',
}: InviteMemberSheetProps) {
  const { hasNativeShare } = usePlatformCapabilities()
  const [codeCopied, setCodeCopied] = useState(false)

  async function handleShareCode() {
    if (!householdCode) return
    const shareText = householdName
      ? `Join ${householdName} on Roost. Use household code ${householdCode} when you sign up.`
      : `Join my household on Roost. Use household code ${householdCode} when you sign up.`
    const result = await shareOrCopy(
      { title: 'Join my household on Roost', text: shareText },
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
    <DraggableSheet
      open={open}
      onOpenChange={(v: boolean) => { if (!v) onClose() }}
      featureColor="#EF4444"
    >
      <div className="px-4 pb-8">
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--roost-text-primary)', marginBottom: 4 }}>
          Invite a member
        </p>
        {householdName && (
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', marginBottom: 18 }}>
            They will join {householdName}
          </p>
        )}

        {/* House code display */}
        <div style={{
          background: '#111827',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Share house code
          </div>
          <div style={{
            fontFamily: "ui-monospace,'JetBrains Mono',monospace",
            fontSize: 22,
            fontWeight: 900,
            color: '#EF4444',
            letterSpacing: '0.18em',
            marginBottom: 10,
          }}>
            {householdCode}
          </div>
          <button
            onClick={handleShareCode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 9,
              background: codeCopied ? '#22C55E' : '#EF4444',
              border: 'none',
              borderBottom: `2px solid ${codeCopied ? '#15803D' : '#C93B3B'}`,
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 900,
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {codeCopied ? <Check size={13} /> : hasNativeShare ? <Share2 size={13} /> : <Copy size={13} />}
            {codeCopied ? 'Copied!' : hasNativeShare ? 'Share code' : 'Copy code'}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--roost-border)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>how to join</span>
          <div style={{ flex: 1, height: 1, background: 'var(--roost-border)' }} />
        </div>

        {/* Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { step: '1', text: 'They download the Roost app or go to the website' },
            { step: '2', text: 'They sign up and select "Join a household"' },
            { step: '3', text: `They enter the code above and they're in` },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#B91C1C',
                fontSize: 11,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}>
                {step}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            marginTop: 24,
            width: '100%',
            padding: '10px',
            borderRadius: 12,
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--roost-text-muted)',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </DraggableSheet>
  )
}
