'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Users,
  ShoppingCart,
  Wallet,
  CheckSquare,
  Calendar,
  CheckCircle2,
  FileText,
  UtensilsCrossed,
  Bell,
  BarChart2,
  LogOut,
} from 'lucide-react'
import { useSession, signOut } from '@/lib/auth/client'

const NAV_ITEMS = [
  { href: '/today',      label: 'Today',      icon: Home },
  { href: '/chores',     label: 'Chores',     icon: CheckSquare },
  { href: '/lists',      label: 'Shopping',   icon: ShoppingCart },
  { href: '/calendar',   label: 'Calendar',   icon: Calendar },
  { href: '/money',      label: 'Money',      icon: Wallet },
  { href: '/tasks',      label: 'Tasks',      icon: CheckCircle2 },
  { href: '/notes',      label: 'Notes',      icon: FileText },
  { href: '/meals',      label: 'Meals',      icon: UtensilsCrossed },
  { href: '/reminders',  label: 'Reminders',  icon: Bell },
  { href: '/stats',      label: 'Stats',      icon: BarChart2 },
  { href: '/household',  label: 'Household',  icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9 }}>
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
          <p style={{ flex: 1, color: '#fff', fontSize: 12, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <button
            onClick={async () => { await signOut(); router.push('/login') }}
            title="Sign out"
            style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
          >
            <LogOut size={14} color="rgba(255,255,255,0.7)" />
          </button>
        </div>
      </div>
    </aside>
  )
}
