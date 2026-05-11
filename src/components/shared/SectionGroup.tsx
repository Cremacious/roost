'use client'

import { type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SectionGroupProps {
  label: string
  count: number
  /** Header text color and badge background */
  color: string
  /** Border-bottom of the outer slab (card variant only). Defaults to color. */
  slabColor?: string
  collapsed?: boolean
  onToggle?: () => void
  children: ReactNode
  /**
   * card  — slab card wrapper with rows inside (chores pattern)
   * list  — styled header above individually-carded items (tasks / reminders pattern)
   */
  variant?: 'card' | 'list'
}

export function SectionGroup({
  label,
  count,
  color,
  slabColor,
  collapsed,
  onToggle,
  children,
  variant = 'card',
}: SectionGroupProps) {
  const header = (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        background: 'none',
        border: 'none',
        cursor: onToggle ? 'pointer' : 'default',
        ...(variant === 'card'
          ? { padding: '12px 14px 10px', borderBottom: '1px solid var(--roost-border)' }
          : { padding: '4px 0' }),
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 800,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#fff',
          backgroundColor: color,
          borderRadius: 20,
          padding: '1px 7px',
          minWidth: 20,
          textAlign: 'center',
        }}
      >
        {count}
      </span>
      {onToggle && (
        <span
          style={{
            marginLeft: 'auto',
            color: variant === 'card' ? 'var(--roost-text-muted)' : color,
          }}
        >
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </span>
      )}
    </button>
  )

  if (variant === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {header}
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {children}
          </div>
        )}
      </div>
    )
  }

  // card variant — slab wrapper
  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${slabColor ?? color}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {header}
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}
