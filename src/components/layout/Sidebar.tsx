'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import RoostLogo from '@/components/shared/RoostLogo'
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
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useSession, signOut } from '@/lib/auth/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { useState } from 'react'
import { useRouter as useNextRouter } from 'next/navigation'

// ─── Nav group structure ──────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    items: [
      { href: '/today',     label: 'Today',     icon: Home },
      { href: '/household', label: 'Household', icon: Users },
    ],
  },
  {
    items: [
      { href: '/lists',    label: 'Shopping', icon: ShoppingCart },
      { href: '/money',    label: 'Money',    icon: Wallet },
      { href: '/meals',    label: 'Meals',    icon: UtensilsCrossed },
      { href: '/chores',   label: 'Chores',   icon: CheckSquare },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    items: [
      { href: '/tasks',     label: 'Tasks',     icon: CheckCircle2 },
      { href: '/reminders', label: 'Reminders', icon: Bell },
      { href: '/notes',     label: 'Notes',     icon: FileText },
    ],
  },
  {
    items: [
      { href: '/stats',    label: 'Stats',    icon: BarChart2 },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

// ─── Sidebar component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { data: session } = useSession()
  const { role } = useHousehold()

  const name = session?.user?.name ?? ''
  const initials = name
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const roleLabel =
    role === 'admin'  ? 'Household admin'  :
    role === 'member' ? 'Member'           :
    role === 'guest'  ? 'Guest'            :
    role === 'child'  ? 'Child account'    : ''

  const { data: profileData } = useQuery<{ user: { avatar_color: string | null } }>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const r = await fetch('/api/user/profile')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 60_000,
  })
  const avatarColor = profileData?.user?.avatar_color ?? 'rgba(255,255,255,0.18)'

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0"
      style={{
        width: 200,
        background: 'linear-gradient(180deg, #D42020 0%, #C01A1A 100%)',
        height: '100dvh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>
          Roost
        </span>
      </div>

      {/* ── Household switcher ─────────────────────────────────────────────── */}
      <HouseholdSwitcherInline />

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {/* Hairline divider between groups */}
            {gi > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 4px' }} />
            )}

            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '8px 10px',
                    borderRadius: 9,
                    backgroundColor: active ? '#ffffff' : 'transparent',
                    textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  <Icon
                    size={15}
                    color={active ? '#C41E1E' : 'rgba(255,255,255,0.55)'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span style={{
                    fontSize: 12.5,
                    fontWeight: active ? 800 : 700,
                    color: active ? '#C41E1E' : 'rgba(255,255,255,0.6)',
                    flex: 1,
                  }}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── User block ────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 10px 12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '9px 11px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* Avatar */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: avatarColor,
            border: '1.5px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>{initials}</span>
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            {roleLabel && (
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                {roleLabel}
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={async () => { await signOut(); router.push('/login') }}
            title="Sign out"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <LogOut size={13} color="rgba(255,255,255,0.5)" />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── Inline household switcher (styled to match redesign) ─────────────────────

function HouseholdSwitcherInline() {
  const [open, setOpen] = useState(false)
  const router = useNextRouter()
  const queryClient = useQueryClient()

  const { data } = useQuery<{ households: Array<{ id: string; name: string; role: string; memberCount: number; isPremium: boolean; isActive: boolean }> }>({
    queryKey: ['households'],
    queryFn: () => fetch('/api/households').then(r => r.json()),
    staleTime: 30_000,
  })

  const households = data?.households ?? []
  const active = households.find(h => h.isActive)

  async function handleSwitch(householdId: string) {
    if (households.find(h => h.id === householdId)?.isActive) { setOpen(false); return }
    await fetch('/api/household/switch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId }),
    })
    queryClient.clear()
    setOpen(false)
    router.push('/today')
  }

  return (
    <div style={{ padding: '0 10px 8px' }}>
      {/* Switcher button — inset dark panel */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 11,
          padding: '9px 11px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* House icon box */}
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          </svg>
        </div>

        <span style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'rgba(255,255,255,0.9)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {active?.name ?? '...'}
        </span>

        <ChevronDown
          size={11}
          color="rgba(255,255,255,0.4)"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          marginTop: 6,
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 10,
          padding: 6,
        }}>
          {households.map(h => (
            <button
              key={h.id}
              onClick={() => handleSwitch(h.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: h.isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                border: 'none',
                borderRadius: 7,
                padding: '8px 10px',
                marginBottom: 3,
                cursor: h.isActive ? 'default' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: h.isActive ? 800 : 700, color: h.isActive ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                  {h.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                  {h.role.charAt(0).toUpperCase() + h.role.slice(1)}
                </div>
              </div>
              {h.isActive && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
              )}
            </button>
          ))}

          <button
            onClick={() => { setOpen(false); router.push('/onboarding') }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              width: '100%',
              background: 'none',
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 7,
              paddingBottom: 3,
              paddingLeft: 10,
              paddingRight: 10,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
              + Join or create another
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
