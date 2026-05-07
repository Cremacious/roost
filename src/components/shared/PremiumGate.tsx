'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { PREMIUM_GATE_CONFIG } from '@/lib/constants/premiumGateConfig'

export type PremiumGateFeature = keyof typeof PREMIUM_GATE_CONFIG

interface PremiumGateProps {
  feature: PremiumGateFeature
  trigger: 'sheet' | 'inline' | 'page'
  onClose?: () => void
}

function GateContent({
  feature,
  onClose,
}: {
  feature: PremiumGateFeature
  onClose?: () => void
}) {
  const router = useRouter()
  const config = PREMIUM_GATE_CONFIG[feature]

  if (!config) return null

  const { icon: Icon, title, subtitle, perks, featureHex, featureDarkHex } = config

  function handleMaybeLater() {
    if (onClose) {
      onClose()
    } else {
      router.back()
    }
  }

  return (
    <div style={{ padding: '8px 0 16px' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: featureHex + '1F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Icon style={{ width: 28, height: 28, color: featureHex }} />
      </div>

      <p style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2, color: 'var(--roost-text-primary)', marginBottom: 8 }}>
        {title}
      </p>
      <p style={{ fontSize: 14, color: 'var(--roost-text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
        {subtitle}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {perks.map((perk) => (
          <div key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CheckCircle2 size={16} style={{ color: featureHex, flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 14, color: 'var(--roost-text-primary)', fontWeight: 600 }}>{perk}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push('/settings/billing')}
        style={{
          display: 'block',
          width: '100%',
          height: 48,
          borderRadius: 12,
          border: 'none',
          borderBottom: `3px solid ${featureDarkHex}`,
          backgroundColor: featureHex,
          color: '#fff',
          fontWeight: 800,
          fontSize: 15,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        Upgrade for $4/month
      </button>

      <button
        type="button"
        onClick={handleMaybeLater}
        style={{
          display: 'block',
          width: '100%',
          height: 40,
          background: 'none',
          border: 'none',
          color: 'var(--roost-text-muted)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Maybe later
      </button>
    </div>
  )
}

export default function PremiumGate({ feature, trigger, onClose }: PremiumGateProps) {
  const router = useRouter()

  if (trigger === 'sheet') {
    return (
      <Sheet open onOpenChange={(v) => { if (!v && onClose) onClose() }}>
        <SheetContent side="bottom" style={{ borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }}>
          <GateContent feature={feature} onClose={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  if (trigger === 'inline') {
    return (
      <div
        style={{
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '4px solid var(--roost-border-bottom)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <GateContent feature={feature} onClose={onClose} />
      </div>
    )
  }

  // 'page'
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={20} style={{ color: 'var(--roost-text-primary)' }} />
      </button>
      <GateContent feature={feature} onClose={onClose} />
    </div>
  )
}
