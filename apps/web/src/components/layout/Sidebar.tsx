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
import { useSession } from '@/lib/auth/client'

const NAV_ITEMS = [
  { href: '/today',      label: 'Today',     icon: Home },
  { href: '/household',  label: 'Household', icon: Users },
  { href: '/food',       label: 'Food',      icon: UtensilsCrossed },
  { href: '/money',      label: 'Money',     icon: Wallet },
  { href: '/more',       label: 'More',      icon: MoreHorizontal },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const name = session?.user?.name ?? ''
  const initials = name
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0"
      style={{
        width: 180,
        backgroundColor: '#DC2626',
        height: '100dvh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo block */}
      <div
        style={{
          padding: '18px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.18)',
            flexShrink: 0,
          }}
        />
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>
          Roost
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 10px',
                borderRadius: 9,
                backgroundColor: active ? 'rgba(255,255,255,0.22)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              <Icon
                size={16}
                color={active ? '#fff' : 'rgba(255,255,255,0.6)'}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                style={{
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* User block */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 9,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.18)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <p style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
