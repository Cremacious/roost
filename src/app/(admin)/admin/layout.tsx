'use client'

import { usePathname, useRouter } from 'next/navigation'
import { BarChart2, Users, Home, Tag, LogOut, FlaskConical } from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Overview', icon: BarChart2, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/households', label: 'Households', icon: Home },
  { href: '/admin/promo-codes', label: 'Promo Codes', icon: Tag },
]

const isDev = process.env.NODE_ENV === 'development'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Login page has its own layout
  if (pathname === '/admin/login') return <>{children}</>

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: 200,
        flexShrink: 0,
        backgroundColor: '#1E293B',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
      }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid #334155' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#6366F1', textTransform: 'uppercase', margin: '0 0 2px' }}>
            Roost
          </p>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#F1F5F9', margin: 0 }}>Admin Panel</p>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: active ? '#6366F120' : 'transparent',
                  color: active ? '#818CF8' : '#94A3B8',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  marginBottom: 2,
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Dev link — only in development */}
        {isDev && (
          <div style={{ padding: '0 8px 8px' }}>
            <div style={{ height: 1, backgroundColor: '#1E3A5F', margin: '0 2px 8px' }} />
            <button
              onClick={() => router.push('/admin/dev')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: pathname.startsWith('/admin/dev') ? '#7C3AED20' : 'transparent',
                color: pathname.startsWith('/admin/dev') ? '#A78BFA' : '#6366F180',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <FlaskConical size={15} />
              Dev
            </button>
          </div>
        )}

        <div style={{ padding: '12px 8px', borderTop: '1px solid #334155' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: '#64748B',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        {children}
      </main>
    </div>
  )
}
