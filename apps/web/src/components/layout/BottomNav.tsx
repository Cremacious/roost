'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  UtensilsCrossed,
  Wallet,
  MoreHorizontal,
} from 'lucide-react'

const TABS = [
  { href: '/today',     label: 'Today',     icon: Home },
  { href: '/household', label: 'Household', icon: Users },
  { href: '/food',      label: 'Food',      icon: UtensilsCrossed },
  { href: '/money',     label: 'Money',     icon: Wallet },
  { href: '/more',      label: 'More',      icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 52,
        backgroundColor: 'var(--roost-surface)',
        borderTop: '1px solid var(--roost-border)',
        display: 'flex',
        zIndex: 50,
      }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        const color = active ? '#EF4444' : '#9CA3AF'
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
