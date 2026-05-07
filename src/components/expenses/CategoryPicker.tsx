'use client'

import {
  Home, Zap, Wifi, Phone, ShoppingCart, UtensilsCrossed, Receipt, Car,
  Droplets, Flame, Tv, Dumbbell, Heart, Shirt, Dog, Baby, Wrench, Music,
  Plane, Gift, Coffee, Beer, Pill, Scissors, Bike, Bus, BookOpen,
  Gamepad2, Package, CreditCard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---- Types ------------------------------------------------------------------

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  is_custom: boolean
  status: string
}

// ---- Icon map ---------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Zap, Wifi, Phone, ShoppingCart, UtensilsCrossed, Receipt, Car,
  Droplets, Flame, Tv, Dumbbell, Heart, Shirt, Dog, Baby, Wrench, Music,
  Plane, Gift, Coffee, Beer, Pill, Scissors, Bike, Bus, BookOpen,
  Gamepad2, Package, CreditCard,
}

export const ICON_OPTIONS = Object.keys(ICON_MAP)

export const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#000000',
]

export function CategoryIcon({
  icon,
  color,
  size = 20,
}: {
  icon: string
  color: string
  size?: number
}) {
  const Icon = ICON_MAP[icon] ?? Receipt
  return <Icon size={size} color={color} />
}

// ---- Picker (used inline in settings/expenses) ------------------------------

interface CategoryPickerProps {
  value: string
  onChange: (categoryId: string) => void
  isAdmin: boolean
}

export default function CategoryPicker({ value, onChange, isAdmin: _isAdmin }: CategoryPickerProps) {
  return (
    <div style={{ color: 'var(--roost-text-muted)', fontSize: 13, padding: '8px 0' }}>
      Category picker
    </div>
  )
}
