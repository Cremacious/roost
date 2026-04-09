'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PREMIUM_GATE_CONFIG } from '@/lib/constants/premiumGateConfig';

export type PremiumGateFeature = keyof typeof PREMIUM_GATE_CONFIG;

interface PremiumGateProps {
  feature: PremiumGateFeature;
  trigger: 'sheet' | 'inline' | 'page';
  onClose?: () => void;
}

function GateContent({
  feature,
  onClose,
}: {
  feature: PremiumGateFeature;
  onClose?: () => void;
}) {
  const router = useRouter();
  const config = PREMIUM_GATE_CONFIG[feature];
  const { icon: Icon, title, subtitle, perks, valueProp, featureHex, featureDarkHex } = config;

  function handleMaybeLater() {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }

  return (
    <div>
      {/* Icon box */}
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

      {/* Title */}
      <p
        style={{
          fontWeight: 900,
          fontSize: 22,
          lineHeight: 1.2,
          color: 'var(--roost-text-primary)',
          marginBottom: 8,
        }}
      >
        {title}
      </p>

      {/* Subtitle */}
      <p
        style={{
          fontWeight: 500,
          fontSize: 14,
          color: 'var(--roost-text-secondary)',
          marginBottom: 20,
          maxWidth: 380,
        }}
      >
        {subtitle}
      </p>

      {/* Perks list */}
      <div style={{ marginBottom: 20 }}>
        {perks.map((perk) => (
          <div
            key={perk}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <CheckCircle2
              style={{
                width: 16,
                height: 16,
                color: featureHex,
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--roost-text-primary)',
              }}
            >
              {perk}
            </span>
          </div>
        ))}
      </div>

      {/* Value prop callout */}
      <div
        style={{
          backgroundColor: featureHex + '14',
          border: `1px solid ${featureHex}40`,
          borderBottom: `3px solid ${featureHex}`,
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontWeight: 700, fontSize: 13, color: featureHex }}>
          {valueProp}
        </p>
      </div>

      {/* Upgrade button */}
      <motion.button
        type="button"
        whileTap={{ y: 2 }}
        onClick={() => router.push('/settings/billing')}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 14,
          backgroundColor: featureHex,
          border: 'none',
          boxShadow: `0 4px 0 ${featureDarkHex}`,
          fontWeight: 800,
          fontSize: 15,
          color: 'white',
          cursor: 'pointer',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Upgrade for $4/month
      </motion.button>

      {/* Maybe later */}
      <button
        type="button"
        onClick={handleMaybeLater}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--roost-text-secondary)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      >
        Maybe later
      </button>
    </div>
  );
}

export default function PremiumGate({ feature, trigger, onClose }: PremiumGateProps) {
  const router = useRouter();

  if (trigger === 'sheet') {
    const config = PREMIUM_GATE_CONFIG[feature];
    return (
      <Sheet open onOpenChange={(v) => { if (!v && onClose) onClose(); }}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl"
          style={{ backgroundColor: 'var(--roost-bg)', maxWidth: 480 }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Drag handle */}
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 9999,
              backgroundColor: 'var(--roost-border)',
              margin: '12px auto 0',
            }}
          />
          <div style={{ padding: '24px 24px 40px' }}>
            <GateContent feature={feature} onClose={onClose} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (trigger === 'inline') {
    const config = PREMIUM_GATE_CONFIG[feature];
    return (
      <div
        style={{
          backgroundColor: 'var(--roost-surface)',
          border: '1px solid var(--roost-border)',
          borderBottom: `4px solid ${config.featureHex}`,
          borderRadius: 20,
          padding: '28px 24px',
        }}
      >
        <GateContent feature={feature} onClose={onClose} />
      </div>
    );
  }

  // trigger === 'page'
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 24px' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--roost-text-secondary)',
          marginBottom: 24,
          padding: 0,
        }}
      >
        <ArrowLeft style={{ width: 20, height: 20 }} />
      </button>
      <GateContent feature={feature} onClose={onClose} />
    </div>
  );
}
