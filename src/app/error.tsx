'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

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
      <h1 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 28, color: '#1A0505', letterSpacing: '-0.3px' }}>
        Something went wrong.
      </h1>
      <p style={{ margin: '0 0 32px', fontSize: 15, fontWeight: 600, color: '#7A3F3F', maxWidth: 340, lineHeight: 1.5 }}>
        An unexpected error occurred. Please try again or go back to the app.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '14px 28px',
            borderRadius: 14,
            backgroundColor: '#EF4444',
            border: 'none',
            borderBottom: '3px solid #C93B3B',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: '14px 28px',
            borderRadius: 14,
            backgroundColor: '#fff',
            border: '1.5px solid #E5E7EB',
            borderBottom: '3px solid #D1D5DB',
            color: '#1A0505',
            fontWeight: 800,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
