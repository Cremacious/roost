import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF5F5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
      fontFamily: 'Nunito, sans-serif',
    }}>
      <div style={{ fontSize: 80, fontWeight: 900, color: '#EF4444', lineHeight: 1, marginBottom: 8 }}>
        404
      </div>
      <h1 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 28, color: '#1A0505', letterSpacing: '-0.3px' }}>
        Page not found.
      </h1>
      <p style={{ margin: '0 0 32px', fontSize: 15, fontWeight: 600, color: '#7A3F3F', maxWidth: 340, lineHeight: 1.5 }}>
        This page doesn&apos;t exist or was moved. Nothing to see here.
      </p>
      <Link
        href="/"
        style={{
          padding: '14px 28px',
          borderRadius: 14,
          backgroundColor: '#EF4444',
          border: 'none',
          borderBottom: '3px solid #C93B3B',
          color: '#fff',
          fontWeight: 800,
          fontSize: 15,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Back to Home
      </Link>
    </div>
  )
}
