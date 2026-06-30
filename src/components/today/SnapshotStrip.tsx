'use client'

import Link from 'next/link'
import { UtensilsCrossed, DollarSign, ShoppingCart, Calendar } from 'lucide-react'

type SlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface SnapshotData {
  meal: { name: string; slotDate: string; slotType: SlotType } | null
  money: { balance: number; label: 'owed' | 'owing' | 'clear' }
  event: { title: string; startsAt: string } | null
  grocery: { count: number }
}

// Local "YYYY-MM-DD" for today / today+1 so we can compare to slotDate strings
// without timezone-shifting through Date.
function todayLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function dateStrPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SLOT_LABEL: Record<SlotType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

function mealHeaderLabel(meal: SnapshotData['meal']): string {
  if (meal && meal.slotDate === todayLocalDateStr() && meal.slotType === 'dinner') {
    return "Tonight's dinner"
  }
  return 'Next meal'
}

function mealSubLabel(meal: SnapshotData['meal']): string {
  if (!meal) return 'Tap to add'
  const slot = SLOT_LABEL[meal.slotType] ?? 'Meal'
  const today = todayLocalDateStr()
  const tomorrow = dateStrPlusDays(1)
  if (meal.slotDate === today) return slot
  if (meal.slotDate === tomorrow) return `Tomorrow's ${slot.toLowerCase()}`
  // Future days within the lookup window: show weekday name.
  // Parse as local midnight to avoid UTC drift.
  const d = new Date(`${meal.slotDate}T00:00:00`)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
  return `${weekday} ${slot.toLowerCase()}`
}

interface SnapTileProps {
  href: string
  iconBg: string
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  valueStyle?: React.CSSProperties
  sub: string
  dimmed?: boolean
}

function SnapTile({ href, iconBg, icon, label, value, valueStyle, sub, dimmed }: SnapTileProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '3px solid var(--roost-border-bottom)',
        borderRadius: 14,
        padding: 14,
        cursor: 'pointer',
        opacity: dimmed ? 0.5 : 1,
      }}>
        {/* Icon box */}
        <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          {icon}
        </div>

        {/* Label */}
        <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 3px' }}>
          {label}
        </p>

        {/* Value */}
        <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px', lineHeight: 1.2, margin: 0, ...valueStyle }}>
          {value}
        </p>

        {/* Sub */}
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--roost-text-muted)', margin: '2px 0 0' }}>
          {sub}
        </p>
      </div>
    </Link>
  )
}

export function SnapshotStrip({ data }: { data: SnapshotData }) {
  // Money tile logic
  const moneyValue = data.money.label === 'clear'
    ? 'All clear'
    : data.money.label === 'owed'
      ? `+$${data.money.balance.toFixed(2)}`
      : `-$${data.money.balance.toFixed(2)}`
  const moneyColor = data.money.label === 'owing' ? '#EF4444' : '#15803D'
  const moneySub   = data.money.label === 'clear'
    ? 'No open balances'
    : data.money.label === 'owed'
      ? 'Net — owed to you'
      : 'Net — you owe'
  const moneyIconBg    = data.money.label === 'owing' ? '#FEE2E2' : '#DCFCE7'
  const moneyIconColor = data.money.label === 'owing' ? '#EF4444' : '#22C55E'

  // Grocery tile logic
  const groceryEmpty = data.grocery.count === 0
  const groceryValue = groceryEmpty ? 'All bought' : `${data.grocery.count}`
  const grocerySub   = groceryEmpty ? '0 items remaining' : 'items unchecked'
  const groceryValueStyle: React.CSSProperties = {
    fontSize: groceryEmpty ? 15 : 22,
    color: groceryEmpty ? '#15803D' : 'var(--roost-text-primary)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {/* Meal */}
      <SnapTile
        href="/meals"
        iconBg="#FFEDD5"
        icon={<UtensilsCrossed size={16} color="#F97316" strokeWidth={2.5} />}
        label={mealHeaderLabel(data.meal)}
        value={data.meal?.name ?? 'Nothing planned'}
        valueStyle={{
          fontSize: data.meal ? 14 : 15,
          color: data.meal ? 'var(--roost-text-primary)' : 'var(--roost-text-muted)',
        }}
        sub={mealSubLabel(data.meal)}
      />

      {/* Money */}
      <SnapTile
        href="/money"
        iconBg={moneyIconBg}
        icon={<DollarSign size={16} color={moneyIconColor} strokeWidth={2.5} />}
        label="Money"
        value={moneyValue}
        valueStyle={{ color: moneyColor }}
        sub={moneySub}
      />

      {/* Grocery */}
      <SnapTile
        href="/lists"
        iconBg="#DBEAFE"
        icon={<ShoppingCart size={16} color="#3B82F6" strokeWidth={2.5} />}
        label="Lists"
        value={groceryValue}
        valueStyle={groceryValueStyle}
        sub={grocerySub}
      />

      {/* Event — coming soon */}
      <SnapTile
        href="/calendar"
        iconBg="#F3F4F6"
        icon={<Calendar size={16} color="#9CA3AF" strokeWidth={2.5} />}
        label="Next event"
        value="—"
        valueStyle={{ color: 'var(--roost-text-muted)' }}
        sub="Coming soon"
        dimmed
      />
    </div>
  )
}
