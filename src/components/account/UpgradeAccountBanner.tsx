'use client'

import { useState } from 'react'
import { ArrowUpCircle } from 'lucide-react'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { UpgradeAccountSheet } from './UpgradeAccountSheet'

const COLOR = '#3B82F6'
const COLOR_DARK = '#1A5CB5'

export function UpgradeAccountBanner() {
  const { role, upgradeAllowed } = useHousehold()
  const [open, setOpen] = useState(false)

  if (role !== 'child' || !upgradeAllowed) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)',
          borderBottom: `4px solid ${COLOR_DARK}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${COLOR}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowUpCircle size={20} color={COLOR} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Ready for your own account?</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Set an email and password to become a full member.</p>
        </div>
      </button>
      <UpgradeAccountSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
