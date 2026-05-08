'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        backgroundColor: '#FFF5F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'sans-serif',
      }}>
        <h1 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 28, color: '#1A0505' }}>
          Something went wrong.
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 15, fontWeight: 600, color: '#7A3F3F', maxWidth: 340, lineHeight: 1.5 }}>
          A critical error occurred. Please refresh the page or try again.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '14px 28px',
            borderRadius: 14,
            backgroundColor: '#EF4444',
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
