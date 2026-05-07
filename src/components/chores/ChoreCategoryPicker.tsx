'use client'

import { CHORE_ICON_MAP } from './choreIconMap'
import { Package } from 'lucide-react'

// ---- Types ------------------------------------------------------------------

export interface ChoreCategory {
  id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  is_custom: boolean
  status: string
}

// ---- Icon helper ------------------------------------------------------------

export function ChoreIcon({
  icon,
  color,
  size = 20,
}: {
  icon: string
  color: string
  size?: number
}) {
  const Icon = CHORE_ICON_MAP[icon] ?? Package
  return <Icon size={size} color={color} />
}

// ---- Picker -----------------------------------------------------------------

interface ChoreCategoryPickerProps {
  selectedId: string | null
  onSelect: (categoryId: string | null) => void
  isPremium: boolean
  isAdmin: boolean
  onUpgradeRequired?: (code: string) => void
}

export default function ChoreCategoryPicker({
  selectedId: _selectedId,
  onSelect: _onSelect,
  isPremium: _isPremium,
  isAdmin: _isAdmin,
  onUpgradeRequired: _onUpgradeRequired,
}: ChoreCategoryPickerProps) {
  return (
    <div style={{ color: 'var(--roost-text-muted)', fontSize: 13, padding: '8px 0' }}>
      Chore category picker
    </div>
  )
}
