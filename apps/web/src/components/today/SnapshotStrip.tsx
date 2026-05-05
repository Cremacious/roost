'use client'

import Link from 'next/link'

interface SnapshotData {
  meal: { name: string } | null
  money: { balance: number; label: 'owed' | 'owing' | 'clear' }
  event: { title: string; startsAt: string } | null
  grocery: { count: number }
}

function Tile({ label, color, href, children }: { label: string; color: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `3px solid ${color}`, borderRadius: 12, padding: '10px 12px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color, letterSpacing: '0.07em', margin: '0 0 4px' }}>{label}</p>
        {children}
      </div>
    </Link>
  )
}

export function SnapshotStrip({ data }: { data: SnapshotData }) {
  const moneyText = data.money.label === 'clear' ? 'All settled' : data.money.label === 'owed' ? `Owed $${data.money.balance.toFixed(2)}` : `You owe $${data.money.balance.toFixed(2)}`
  const moneyColor = data.money.label === 'owing' ? '#EF4444' : data.money.label === 'owed' ? '#22C55E' : 'var(--roost-text-muted)'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Tile label="TONIGHT" color="#F97316" href="/food">
        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--roost-text-primary)', margin: 0 }}>{data.meal?.name ?? 'Nothing planned'}</p>
      </Tile>
      <Tile label="MONEY" color="#22C55E" href="/money">
        <p style={{ fontWeight: 700, fontSize: 13, color: moneyColor, margin: 0 }}>{moneyText}</p>
      </Tile>
      <Tile label="NEXT UP" color="#3B82F6" href="/household">
        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--roost-text-primary)', margin: 0 }}>{data.event?.title ?? 'Nothing upcoming'}</p>
      </Tile>
      <Tile label="GROCERY" color="#F59E0B" href="/food">
        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--roost-text-primary)', margin: 0 }}>{data.grocery.count > 0 ? `${data.grocery.count} items` : 'List is empty'}</p>
      </Tile>
    </div>
  )
}
