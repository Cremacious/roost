'use client'

import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

interface DebtItem {
  from: string
  to: string
  amount: number
  splitIds: string[]
  iOwe?: boolean
  pendingClaim?: { settledByPayer: boolean; settledByPayee: boolean } | null
  toVenmoHandle?: string | null
  toCashappHandle?: string | null
}

interface Member {
  id: string
  name: string
  avatarColor?: string
}

interface Props {
  open: boolean
  onClose: () => void
  debts: DebtItem[]
  currentUserId: string
  members: Member[]
  onSelect: (debt: DebtItem) => void
}

function MiniAvatar({ name, color }: { name: string; color?: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      backgroundColor: color ?? COLOR,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: 13,
    }}>
      {name.trim().charAt(0).toUpperCase()}
    </div>
  )
}

export function SettlePickerSheet({ open, onClose, debts, currentUserId, members, onSelect }: Props) {
  const memberMap = new Map(members.map(m => [m.id, m]))

  // Debts where current user owes first, then debts where others owe current user
  const sorted = [...debts].sort((a, b) => {
    const aOwe = a.iOwe ? 0 : 1
    const bOwe = b.iOwe ? 0 : 1
    return aOwe - bOwe
  })

  return (
    <DraggableSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
          Settle up
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((debt, i) => {
            const otherId = debt.iOwe ? debt.to : debt.from
            const other = memberMap.get(otherId)
            const otherName = other?.name ?? 'Unknown'
            const iOwe = debt.iOwe

            return (
              <button
                key={`${debt.from}-${debt.to}-${i}`}
                type="button"
                onClick={() => { onSelect(debt); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                }}
              >
                <MiniAvatar name={otherName} color={other?.avatarColor} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 15, margin: 0 }}>
                    {otherName}
                  </p>
                  <p style={{
                    fontSize: 12, fontWeight: 600, margin: 0,
                    color: iOwe ? '#EF4444' : COLOR_DARK,
                  }}>
                    {iOwe ? 'You owe' : 'Owes you'}
                  </p>
                </div>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)', margin: 0 }}>
                  ${debt.amount.toFixed(2)}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </DraggableSheet>
  )
}
