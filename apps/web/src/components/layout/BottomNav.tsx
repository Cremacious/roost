'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Utensils, Wallet, MoreHorizontal } from 'lucide-react'

const TABS = [
  { href: '/today',     label: 'Today',     icon: Home,          activeColor: '#EF4444' },
  { href: '/household', label: 'Household', icon: Users,         activeColor: '#3B82F6' },
  { href: '/food',      label: 'Food',      icon: Utensils,      activeColor: '#F97316' },
  { href: '/money',     label: 'Money',     icon: Wallet,        activeColor: '#22C55E' },
  { href: '/more',      label: 'More',      icon: MoreHorizontal, activeColor: '#9CA3AF' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 52,
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
              gap: 2,
              textDecoration: 'none',
            }}
          >
            <Icon size={18} color={color} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: 7, fontWeight: 800, color }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
