import Link from 'next/link'
import { getSession } from '@/lib/auth/helpers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getSession()

  // Logged-in users go straight to the app
  if (session) {
    redirect('/today')
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-nunito), system-ui, sans-serif',
      }}
    >
      {/* Logo placeholder */}
      <div
        style={{
          width: 72,
          height: 72,
          backgroundColor: '#EF4444',
          borderRadius: 20,
          marginBottom: 20,
        }}
      />

      <h1
        style={{
          fontSize: 40,
          fontWeight: 900,
          color: '#111827',
          letterSpacing: '-1px',
          margin: 0,
          textAlign: 'center',
        }}
      >
        Roost
      </h1>
      <p
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#6B7280',
          marginTop: 8,
          marginBottom: 40,
          textAlign: 'center',
        }}
      >
        Home, sorted.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            backgroundColor: '#EF4444',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            padding: '14px 28px',
            borderRadius: 14,
            border: 'none',
            borderBottom: '3px solid #C93B3B',
            textDecoration: 'none',
          }}
        >
          Get started
        </Link>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            backgroundColor: '#F9FAFB',
            color: '#374151',
            fontWeight: 800,
            fontSize: 15,
            padding: '14px 28px',
            borderRadius: 14,
            border: '1.5px solid #E5E7EB',
            borderBottom: '3px solid #D1D5DB',
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </div>
    </main>
  )
}
