'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Users,
  UtensilsCrossed,
  Wallet,
  MoreHorizontal,
  ShoppingCart,
  CheckSquare,
  Calendar,
  CheckCircle2,
  Bell,
  FileText,
  BarChart2,
  Settings,
} from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const TABS = [
  { href: '/today',     label: 'Today',     icon: Home,           activeColor: '#EF4444' },
  { href: '/household', label: 'Household', icon: Users,          activeColor: '#3B82F6' },
  { href: '/meals',     label: 'Meals',     icon: UtensilsCrossed, activeColor: '#F97316' },
  { href: '/money',     label: 'Money',     icon: Wallet,         activeColor: '#22C55E' },
]

const MORE_ITEMS = [
  { href: '/lists',      label: 'Shopping',  icon: ShoppingCart,  color: '#F59E0B' },
  { href: '/chores',     label: 'Chores',    icon: CheckSquare,   color: '#EF4444' },
  { href: '/calendar',   label: 'Calendar',  icon: Calendar,      color: '#3B82F6' },
  { href: '/tasks',      label: 'Tasks',     icon: CheckCircle2,  color: '#EC4899' },
  { href: '/reminders',  label: 'Reminders', icon: Bell,          color: '#06B6D4' },
  { href: '/notes',      label: 'Notes',     icon: FileText,      color: '#A855F7' },
  { href: '/stats',      label: 'Stats',     icon: BarChart2,     color: '#6366F1' },
  { href: '/settings',   label: 'Settings',  icon: Settings,      color: '#9CA3AF' },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const moreActive = MORE_ITEMS.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))

  function handleMoreItemClick(href: string) {
    setMoreOpen(false)
    router.push(href)
  }

  return (
    <>
      <nav
        className="flex md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: 'var(--roost-surface)',
          borderTop: '1px solid var(--roost-border)',
          zIndex: 50,
        }}
      >
        {TABS.map(({ href, label, icon: Icon, activeColor }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const color = active ? activeColor : '#9CA3AF'
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
              }}
            >
              <Icon size={20} color={color} strokeWidth={active ? 2.5 : 2} />
              <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <MoreHorizontal size={20} color={moreActive ? '#EF4444' : '#9CA3AF'} strokeWidth={moreActive ? 2.5 : 2} />
          <span style={{ fontSize: 10, fontWeight: 700, color: moreActive ? '#EF4444' : '#9CA3AF' }}>More</span>
        </button>
      </nav>

      {/* More sheet */}
      <DraggableSheet open={moreOpen} onOpenChange={v => !v && setMoreOpen(false)}>
        <div style={{ padding: '0 16px 32px' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 16 }}>
            More
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {MORE_ITEMS.map(({ href, label, icon: Icon, color }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <button
                  key={href}
                  onClick={() => handleMoreItemClick(href)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--roost-surface)',
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: active ? `3px solid ${color}` : '3px solid var(--roost-border-bottom)',
                    borderRadius: 12,
                    padding: '14px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      backgroundColor: color + '18',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={color} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </DraggableSheet>
    </>
  )
}
