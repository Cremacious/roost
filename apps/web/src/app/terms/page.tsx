import Link from 'next/link'

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            fontWeight: 900,
            fontSize: 24,
            color: '#EF4444',
            margin: 0,
            fontFamily: 'var(--font-nunito)',
          }}
        >
          Roost
        </p>
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-nunito)',
          fontWeight: 900,
          fontSize: 28,
          color: '#111827',
          margin: '0 0 16px',
          textAlign: 'center',
        }}
      >
        Terms of Service
      </h1>
      <p
        style={{
          fontSize: 14,
          color: '#6B7280',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        This page is coming soon. We are working on it.
      </p>
      <Link
        href="/"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#EF4444',
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
